import requests
import json
import os
import sys
import argparse
import ftplib
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from threading import Thread
from datetime import datetime

from config import (
    MIKROTIK_HOST, MIKROTIK_USER, MIKROTIK_PASS,
    MIKROTIK_PATH, MIKROTIK_HOTSPOT,
    BASE_URL, USUARIO, SENHA, UNIDADE, OUTPUT_DIR
)

_gui_log_callback = None


def log(msg):
    """Loga mensagens no console e em arquivo de log persistente"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted)
    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        log_path = os.path.join(OUTPUT_DIR, "export.log")
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except OSError:
        pass
    
    if _gui_log_callback:
        _gui_log_callback(formatted)


def ensure_remote_parent_dir(ftp, remote_path):
    """Garante de forma recursiva que todos os diretorios pai de um caminho remoto existam"""
    try:
        orig_dir = ftp.pwd()
    except Exception:
        orig_dir = "/"

    parts = remote_path.replace("\\", "/").split("/")[:-1]
    
    try:
        ftp.cwd("/")
    except Exception:
        pass

    for part in parts:
        if not part:
            continue
        try:
            ftp.cwd(part)
        except Exception:
            try:
                ftp.mkd(part)
                ftp.cwd(part)
            except Exception:
                pass

    try:
        ftp.cwd(orig_dir)
    except Exception:
        pass


def prune_local_history():
    """Mantem apenas os 3 arquivos de historico local (ofertas_combinado_*.json) mais recentes"""
    try:
        if not os.path.exists(OUTPUT_DIR):
            return
        files = []
        for name in os.listdir(OUTPUT_DIR):
            if name.startswith("ofertas_combinado_") and name.endswith(".json"):
                path = os.path.join(OUTPUT_DIR, name)
                if os.path.isfile(path):
                    files.append((path, os.path.getmtime(path)))
        
        # Ordena do mais recente para o mais antigo
        files.sort(key=lambda x: x[1], reverse=True)
        
        # Remove os excedentes se passarem de 3 arquivos historicos
        if len(files) > 3:
            for path, _ in files[3:]:
                try:
                    os.remove(path)
                    log(f"Removido historico antigo local: {os.path.basename(path)}")
                except Exception as e:
                    log(f"Erro ao remover historico antigo local {path}: {e}")
    except Exception as e:
        log(f"Erro na limpeza do historico local: {e}")


def _salvar_combinado(combined, timestamp):
    path_fixed = os.path.join(OUTPUT_DIR, "ofertas_combinado.json")
    path_ts = os.path.join(OUTPUT_DIR, f"ofertas_combinado_{timestamp}.json")
    for path in (path_fixed, path_ts):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(combined, f, indent=2, ensure_ascii=False)
    log(f"Salvo: {path_fixed}")
    log(f"Historico: {path_ts}")
    prune_local_history()


def batch_export():
    """Executa exportacao completa via linha de comando (sem GUI)"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # 1. Autenticar
    log("Autenticando na API RP Services...")
    try:
        resp = requests.post(f"{BASE_URL}/v1.1/auth",
                             json={"usuario": USUARIO, "senha": SENHA},
                             headers={"Content-Type": "application/json"},
                             timeout=10)
        data = resp.json()
        data = data.get("response") or data
        token = data.get("token")
        if not token:
            log("ERRO: Falha na autenticacao - Token nao obtido")
            sys.exit(1)
        log(f"  Token obtido: {token[:20]}...{token[-8:]}")
    except Exception as ex:
        log(f"ERRO de conexao na autenticacao: {ex}")
        sys.exit(1)

    # 2. Listar departamentos
    log("Listando departamentos da API...")
    try:
        resp = requests.get(f"{BASE_URL}/v1.1/departamentos",
                            headers={"token": token}, timeout=10)
        data = resp.json()
        data = data.get("response") or data
        departamentos = data.get("content") or []
        log(f"  {len(departamentos)} departamentos encontrados")
    except Exception as ex:
        log(f"ERRO ao buscar departamentos: {ex}")
        sys.exit(1)

    # 3. Buscar ofertas de cada departamento
    todas_ofertas = []
    total = 0
    for d in departamentos:
        cod = d["codigo"]
        nome = d["descricao"]
        log(f"  Buscando departamento: {nome} ({cod})...")
        try:
            resp = requests.get(
                f"{BASE_URL}/v1.0/produtounidade/ofertas",
                params={"unidade": UNIDADE, "departamento": cod, "limit": "200"},
                headers={"token": token},
                timeout=30
            )
            data = resp.json()
            data = data.get("response") or data
            items = data.get("content") or []
            for item in items:
                item["_departamento_codigo"] = cod
                item["_departamento_nome"] = nome
            todas_ofertas.extend(items)
            total += len(items)
            log(f"    -> Encontradas {len(items)} ofertas")
        except Exception as ex:
            log(f"    -> ERRO ao obter ofertas do depto {nome}: {ex}")

    # 4. Salvar combinado
    if departamentos:
        combined = {
            "exportado_em": timestamp,
            "total_ofertas": total,
            "departamentos": [d["descricao"] for d in departamentos],
            "ofertas": todas_ofertas
        }
        _salvar_combinado(combined, timestamp)

    # 5. Upload via FTP
    log(f"Iniciando envio via FTP para o MikroTik ({MIKROTIK_HOST})...")
    ftp = None
    try:
        ftp = ftplib.FTP(MIKROTIK_HOST, timeout=10)
        ftp.login(MIKROTIK_USER, MIKROTIK_PASS)

        ensure_remote_parent_dir(ftp, f"{MIKROTIK_PATH}/ofertas_combinado.json")
        ftp.cwd(MIKROTIK_PATH)

        local = os.path.join(OUTPUT_DIR, "ofertas_combinado.json")
        if os.path.isfile(local):
            with open(local, "rb") as f:
                ftp.storbinary("STOR ofertas_combinado.json", f)
            log(f"Upload OK: {MIKROTIK_PATH}/ofertas_combinado.json")
    except Exception as e:
        log(f"Upload falhou: {e}")
    finally:
        if ftp:
            try: ftp.quit()
            except Exception: pass

    log(f"Exportacao concluida em lote: {len(departamentos)} departamentos, {total} ofertas no total")

    # 6. Sincronizar arquivos do hotspot
    sync_hotspot()



def sync_hotspot():
    """Envia todos os arquivos do portal para flash/hotspot/ via FTP"""
    EXT_INCLUIR = {".html", ".css", ".js", ".woff2", ".png", ".jpg",
                   ".jpeg", ".gif", ".svg", ".webp", ".ico", ".xml", ".txt", ".json"}
    EXCLUIR_DIRS = {"ofertas_export", "docs", "__pycache__", ".git", "backup-mikrotik", ".agents", ".claude", ".opencode"}
    EXCLUIR_ARQS = {".env", ".gitignore", "AGENTS.md", "PRODUCT.md", "opencode.json"}

    log("Iniciando sincronizacao de arquivos do hotspot via FTP...")

    try:
        ftp = ftplib.FTP(MIKROTIK_HOST, timeout=10)
        ftp.login(MIKROTIK_USER, MIKROTIK_PASS)
    except Exception as e:
        log(f"  FTP falhou ao conectar: {e}")
        return

    enviados = 0
    for raiz, dirs, arqs in os.walk("."):
        # Pular diretorios excluidos
        dirs[:] = [d for d in dirs if d not in EXCLUIR_DIRS]

        for nome in arqs:
            if nome in EXCLUIR_ARQS:
                continue
            if not any(nome.endswith(ext) for ext in EXT_INCLUIR):
                continue

            local = os.path.join(raiz, nome)
            remoto = os.path.join(MIKROTIK_HOTSPOT, os.path.relpath(local, ".")).replace("\\", "/")

            try:
                # Garante que os diretorios do arquivo existam no MikroTik
                ensure_remote_parent_dir(ftp, remoto)
                with open(local, "rb") as f:
                    ftp.storbinary(f"STOR {remoto}", f)
                enviados += 1
                if enviados <= 5 or enviados % 20 == 0:
                    log(f"  Sincronizado: {remoto}")
            except Exception as e:
                log(f"  ERRO ao enviar {remoto}: {e}")

    # Upload do combinado (excluido do walk acima por estar em ofertas_export/)
    try:
        ftp.cwd("/")
    except Exception:
        pass
    local = os.path.join(OUTPUT_DIR, "ofertas_combinado.json")
    if os.path.isfile(local):
        remoto = os.path.join(MIKROTIK_HOTSPOT, OUTPUT_DIR, "ofertas_combinado.json").replace("\\", "/")
        try:
            ensure_remote_parent_dir(ftp, remoto)
            with open(local, "rb") as f:
                ftp.storbinary(f"STOR {remoto}", f)
            log(f"  Sincronizado: {remoto}")
            enviados += 1
        except Exception as e:
            log(f"  ERRO ao enviar {remoto}: {e}")

    ftp.quit()
    log(f"Sincronizacao concluida. {enviados} arquivos atualizados em {MIKROTIK_HOTSPOT}/")



class OfertasApp:
    def __init__(self, root):
        self.root = root
        root.title("Painel Integrado MikroTik HotSpot - Supermercado Santos")
        root.geometry("850x680")
        root.minsize(750, 550)

        self.departamentos = []
        self.token = None

        # Registra callback de log global para atualização em tempo real na interface
        global _gui_log_callback
        _gui_log_callback = self._append_to_log_area

        # Cores e fontes do Design System (Modern & Premium)
        COLOR_PRIMARY = "#E8732A"    # Laranja Santos
        COLOR_BG = "#F7FAFC"         # Cinza claro de fundo
        COLOR_CARD_BG = "#FFFFFF"    # Fundo de painéis
        COLOR_TEXT = "#2D3748"       # Cinza escuro para textos
        COLOR_MUTED = "#718096"      # Cinza médio
        COLOR_BORDER = "#E2E8F0"     # Borda sutil
        FONT_BODY = ("Segoe UI", 10)
        FONT_BUTTON = ("Segoe UI", 10, "bold")

        root.configure(bg=COLOR_BG)

        style = ttk.Style()
        style.theme_use("clam")

        # Configuração de Estilos ttk
        style.configure("TLabel", background=COLOR_BG, foreground=COLOR_TEXT, font=FONT_BODY)
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"), foreground=COLOR_PRIMARY, background=COLOR_BG)
        style.configure("Muted.TLabel", font=("Segoe UI", 9), foreground=COLOR_MUTED, background=COLOR_BG)

        # Botões Principais (Laranja)
        style.configure("TButton", font=FONT_BUTTON, padding=(12, 6), background=COLOR_PRIMARY, foreground="#FFFFFF")
        style.map("TButton",
                  background=[("active", "#CF5F1C"), ("disabled", "#CBD5E0")],
                  foreground=[("disabled", "#718096")])

        # Botão Secundário (Branco com borda/texto laranja)
        style.configure("Secondary.TButton", font=FONT_BUTTON, padding=(12, 6), background="#FFFFFF", foreground=COLOR_PRIMARY, borderwidth=1)
        style.map("Secondary.TButton",
                  background=[("active", COLOR_BORDER), ("disabled", COLOR_BG)],
                  foreground=[("disabled", COLOR_MUTED)])

        # Barra de progresso
        style.configure("TProgressbar", thickness=8, troughcolor=COLOR_BORDER, background=COLOR_PRIMARY)

        # Customização do Treeview (Tabela de Departamentos)
        style.configure("Treeview",
                        background=COLOR_CARD_BG,
                        foreground=COLOR_TEXT,
                        rowheight=26,
                        fieldbackground=COLOR_CARD_BG,
                        font=FONT_BODY,
                        borderwidth=0)
        style.configure("Treeview.Heading",
                        background=COLOR_BORDER,
                        foreground=COLOR_TEXT,
                        font=("Segoe UI", 9, "bold"),
                        padding=(4, 6))
        style.map("Treeview", background=[("selected", "#FEEBC8")], foreground=[("selected", COLOR_TEXT)])

        # Frame Principal com espaçamento de borda
        main_frame = ttk.Frame(root, padding=16)
        main_frame.pack(fill=tk.BOTH, expand=True)

        # ----------------------------------------------------
        # 1. Cabeçalho (Header)
        # ----------------------------------------------------
        header_frame = ttk.Frame(main_frame)
        header_frame.pack(fill=tk.X, pady=(0, 12))
        ttk.Label(header_frame, text="Supermercado Santos — HotSpot captive portal", style="Header.TLabel").pack(anchor=tk.W)
        ttk.Label(header_frame, text="Painel Integrado de Controle e Sincronização Web RouterOS", style="Muted.TLabel").pack(anchor=tk.W)

        ttk.Separator(main_frame, orient='horizontal').pack(fill=tk.X, pady=(0, 12))

        # ----------------------------------------------------
        # 2. Painel de Controle (Disposição em Grid Profissional de 3 Colunas)
        # ----------------------------------------------------
        control_frame = ttk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=(0, 12))

        # Configura as 3 colunas para ocuparem exatamente a mesma largura (uniformidade perfeita)
        control_frame.columnconfigure(0, weight=1, uniform="ctrl_cols")
        control_frame.columnconfigure(1, weight=1, uniform="ctrl_cols")
        control_frame.columnconfigure(2, weight=1, uniform="ctrl_cols")

        # Coluna 1: Preparação e Filtros
        prep_frame = ttk.LabelFrame(control_frame, text=" 1. Conexão & Filtros ", padding=10)
        prep_frame.grid(row=0, column=0, sticky="nswe", padx=(0, 4))
        prep_frame.columnconfigure(0, weight=1)
        prep_frame.rowconfigure(0, weight=1)
        prep_frame.rowconfigure(1, weight=1)

        ttk.Button(prep_frame, text="Conectar e Listar", command=self.conectar_e_listar).grid(row=0, column=0, sticky="we", pady=(0, 6))
        ttk.Button(prep_frame, text="Selecionar Favoritos", command=self.selecionar_padrao, style="Secondary.TButton").grid(row=1, column=0, sticky="we")

        # Coluna 2: Exportação de Ofertas
        exp_frame = ttk.LabelFrame(control_frame, text=" 2. Exportação de Ofertas ", padding=10)
        exp_frame.grid(row=0, column=1, sticky="nswe", padx=4)
        exp_frame.columnconfigure(0, weight=1)
        exp_frame.rowconfigure(0, weight=1)
        exp_frame.rowconfigure(1, weight=1)

        ttk.Button(exp_frame, text="Exportar Selecionados", command=self.exportar).grid(row=0, column=0, sticky="we", pady=(0, 6))
        ttk.Button(exp_frame, text="Exportar TODOS", command=self.exportar_todos, style="Secondary.TButton").grid(row=1, column=0, sticky="we")

        # Coluna 3: Sincronização do Hotspot
        sync_frame = ttk.LabelFrame(control_frame, text=" 3. Portal Captivo HotSpot ", padding=10)
        sync_frame.grid(row=0, column=2, sticky="nswe", padx=(4, 0))
        sync_frame.columnconfigure(0, weight=1)
        sync_frame.rowconfigure(0, weight=1)

        ttk.Button(sync_frame, text="Atualizar Arquivos\ndo HotSpot", command=self.sincronizar_hotspot_gui).grid(row=0, column=0, sticky="nswe", pady=1)

        # ----------------------------------------------------
        # 3. Tabela de Departamentos
        # ----------------------------------------------------
        ttk.Label(main_frame, text="Departamentos disponíveis para exportação:", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W, pady=(0, 4))

        tree_frame = ttk.Frame(main_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 12))

        tree_scroll = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL)
        self.tree = ttk.Treeview(tree_frame, columns=("codigo", "nome", "sel"), show="headings",
                                 height=10, yscrollcommand=tree_scroll.set)
        tree_scroll.config(command=self.tree.yview)

        self.tree.heading("codigo", text="Código")
        self.tree.heading("nome", text="Departamento")
        self.tree.heading("sel", text="Selecionado")

        self.tree.column("codigo", width=80, anchor=tk.CENTER)
        self.tree.column("nome", width=420)
        self.tree.column("sel", width=100, anchor=tk.CENTER)

        # Estilo de linhas alternadas (Zebra striping)
        self.tree.tag_configure("oddrow", background="#FFFFFF")
        self.tree.tag_configure("evenrow", background="#F8FAFC")

        self.tree.bind("<ButtonRelease-1>", self.toggle_check)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        # ----------------------------------------------------
        # 4. Terminal de Logs & Barra de Progresso
        # ----------------------------------------------------
        ttk.Label(main_frame, text="Log de Operações:", font=("Segoe UI", 9, "bold")).pack(anchor=tk.W, pady=(0, 4))

        log_frame = ttk.Frame(main_frame)
        log_frame.pack(fill=tk.X, pady=(0, 6))

        self.log_area = scrolledtext.ScrolledText(log_frame, height=7, state=tk.DISABLED,
                                                 font=("Consolas", 9), background="#1A202C", foreground="#E2E8F0",
                                                 insertbackground="#FFFFFF", relief="flat", borderwidth=0, padx=8, pady=8)
        self.log_area.pack(fill=tk.BOTH, expand=True)

        # Barra de progresso
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate')
        self.progress.pack(fill=tk.X)

    def _append_to_log_area(self, formatted_msg):
        """Adiciona mensagens à área de log de forma segura a partir de qualquer thread"""
        try:
            self.log_area.config(state=tk.NORMAL)
            self.log_area.insert(tk.END, f"{formatted_msg}\n")
            self.log_area.see(tk.END)
            self.log_area.config(state=tk.DISABLED)
        except Exception:
            pass

    def log(self, msg):
        """Envia uma mensagem ao sistema de log global (que atualiza o console, arquivo e interface)"""
        log(msg)

    def conectar_e_listar(self):
        Thread(target=self._conectar, daemon=True).start()

    def _conectar(self):
        self.progress.start()
        try:
            self.log("Autenticando na API...")
            resp = requests.post(f"{BASE_URL}/v1.1/auth",
                                 json={"usuario": USUARIO, "senha": SENHA},
                                 headers={"Content-Type": "application/json"},
                                 timeout=10)
            data = resp.json()
            data = data.get("response") or data
            self.token = data.get("token")

            if not self.token:
                self.log("ERRO: Token nao obtido")
                messagebox.showerror("Erro", "Falha na autenticacao")
                return

            self.log(f"Token obtido: {self.token[:20]}...{self.token[-8:]}")

            self.log("Listando departamentos...")
            resp = requests.get(f"{BASE_URL}/v1.1/departamentos",
                                headers={"token": self.token}, timeout=10)
            data = resp.json()
            data = data.get("response") or data
            self.departamentos = data.get("content") or []

            for item in self.tree.get_children():
                self.tree.delete(item)

            for i, d in enumerate(self.departamentos):
                cod = d.get("codigo", "")
                nome = d.get("descricao", "")
                tag_row = "evenrow" if i % 2 == 0 else "oddrow"
                self.tree.insert("", tk.END, values=(cod, nome, "☐"), tags=(cod, tag_row))

            self.log(f"{len(self.departamentos)} departamentos carregados")

        except Exception as e:
            self.log(f"ERRO: {e}")
        finally:
            self.progress.stop()

    def toggle_check(self, event):
        item = self.tree.identify_row(event.y)
        if not item:
            return
        col = self.tree.identify_column(event.x)
        if col != "#3":
            return
        vals = list(self.tree.item(item, "values"))
        if vals[2] == "☐":
            vals[2] = "☑"
        else:
            vals[2] = "☐"
        self.tree.item(item, values=vals)

    def selecionar_padrao(self):
        favoritos = ["hortifruti", "acougue", "limpeza", "frios", "congelados"]
        for item in self.tree.get_children():
            vals = list(self.tree.item(item, "values"))
            nome = vals[1].lower()
            if any(f in nome for f in favoritos):
                vals[2] = "☑"
            else:
                vals[2] = "☐"
            self.tree.item(item, values=vals)
        count = sum(1 for i in self.tree.get_children() if self.tree.item(i, "values")[2] == "☑")
        self.log(f"{count} departamentos favoritos selecionados")

    def get_selecionados(self):
        selecionados = []
        for item in self.tree.get_children():
            vals = self.tree.item(item, "values")
            if vals[2] == "☑":
                selecionados.append({"codigo": vals[0], "nome": vals[1]})
        return selecionados

    def exportar(self):
        selecionados = self.get_selecionados()
        if not selecionados:
            messagebox.showwarning("Aviso", "Selecione ao menos um departamento")
            return
        Thread(target=self._exportar, args=(selecionados,), daemon=True).start()

    def exportar_todos(self):
        todos = [{"codigo": d["codigo"], "nome": d["descricao"]} for d in self.departamentos]
        if not todos:
            messagebox.showwarning("Aviso", "Lista de departamentos vazia. Conecte primeiro.")
            return
        Thread(target=self._exportar, args=(todos,), daemon=True).start()

    def _exportar(self, selecionados):
        self.progress.start()
        try:
            os.makedirs(OUTPUT_DIR, exist_ok=True)

            total_ofertas = 0
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            todas_ofertas = []

            for depto in selecionados:
                cod = depto["codigo"]
                nome = depto["nome"]
                self.log(f"Buscando ofertas: {nome} ({cod})...")

                resp = requests.get(
                    f"{BASE_URL}/v1.0/produtounidade/ofertas",
                    params={"unidade": UNIDADE, "departamento": cod, "limit": "200"},
                    headers={"token": self.token},
                    timeout=30
                )
                data = resp.json()
                data = data.get("response") or data
                items = data.get("content") or []

                for item in items:
                    item["_departamento_codigo"] = cod
                    item["_departamento_nome"] = nome

                todas_ofertas.extend(items)
                total_ofertas += len(items)
                self.log(f"  -> {len(items)} ofertas encontradas")

            if selecionados:
                combined = {
                    "exportado_em": timestamp,
                    "total_ofertas": total_ofertas,
                    "departamentos": [d["nome"] for d in selecionados],
                    "ofertas": todas_ofertas
                }
                _salvar_combinado(combined, timestamp)

            # Upload do combinado para o MikroTik
            self._upload_to_mikrotik()

            messagebox.showinfo("Concluido",
                f"{len(selecionados)} departamentos processados\n"
                f"{total_ofertas} ofertas exportadas\n"
                f"Pasta: {OUTPUT_DIR}/")

        except Exception as e:
            self.log(f"ERRO: {e}")
            messagebox.showerror("Erro", str(e))
        finally:
            self.progress.stop()

    def _upload_to_mikrotik(self):
        """Envia ofertas_combinado.json para o MikroTik via FTP"""
        local_path = os.path.join(OUTPUT_DIR, "ofertas_combinado.json")
        if not os.path.isfile(local_path):
            self.log("Upload ignorado: ofertas_combinado.json nao encontrado")
            return

        self.log(f"Enviando para MikroTik ({MIKROTIK_HOST})...")
        ftp = None
        try:
            ftp = ftplib.FTP(MIKROTIK_HOST, timeout=10)
            ftp.login(MIKROTIK_USER, MIKROTIK_PASS)

            ensure_remote_parent_dir(ftp, f"{MIKROTIK_PATH}/ofertas_combinado.json")
            ftp.cwd(MIKROTIK_PATH)

            with open(local_path, "rb") as f:
                ftp.storbinary("STOR ofertas_combinado.json", f)

            self.log("Upload concluido: flash/hotspot/ofertas_export/ofertas_combinado.json")
        except Exception as e:
            self.log(f"Upload falhou: {e}")
        finally:
            if ftp:
                try: ftp.quit()
                except Exception: pass

    def sincronizar_hotspot_gui(self):
        """Dispara a sincronização de arquivos do hotspot em thread secundária"""
        Thread(target=self._sincronizar_hotspot_process, daemon=True).start()

    def _sincronizar_hotspot_process(self):
        self.progress.start()
        try:
            self.log("Iniciando sincronizacao de arquivos do hotspot via FTP...")
            sync_hotspot()
            self.log("Sincronizacao de arquivos concluida com sucesso!")
            messagebox.showinfo("Sucesso", "Arquivos do HotSpot sincronizados com sucesso no MikroTik!")
        except Exception as e:
            self.log(f"ERRO de sincronizacao: {e}")
            messagebox.showerror("Erro", f"Falha na sincronização: {e}")
        finally:
            self.progress.stop()



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Exportar ofertas RP Services")
    parser.add_argument("--all", "--batch", action="store_true",
                        help="Exporta ofertas + upload FTP + sincroniza hotspot (completo)")
    parser.add_argument("--sync", action="store_true",
                        help="Apenas sincroniza arquivos do hotspot via FTP")
    args = parser.parse_args()

    if args.sync:
        sync_hotspot()
    elif args.all:
        batch_export()
    else:
        root = tk.Tk()
        app = OfertasApp(root)
        root.mainloop()
