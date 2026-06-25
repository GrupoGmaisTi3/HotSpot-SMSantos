(function () {
  'use strict';

  function mascaraCPF(input) {
    var val = input.value.replace(/\D/g, '');
    if (val.length > 3 && val.length <= 6) {
      val = val.replace(/(\d{3})(\d)/, '$1.$2');
    } else if (val.length > 6 && val.length <= 9) {
      val = val.replace(/(\d{3})(\d{3})(\d)/, '$1.$2.$3');
    } else if (val.length > 9) {
      val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    }
    input.value = val.slice(0, 14);
  }

  function mascaraTelefone(input) {
    var val = input.value.replace(/\D/g, '');
    if (val.length > 2 && val.length <= 7) {
      val = val.replace(/(\d{2})(\d)/, '($1) $2');
    } else if (val.length > 7 && val.length <= 11) {
      val = val.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3');
    } else if (val.length > 11) {
      val = val.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    input.value = val.slice(0, 15);
  }

  function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    var soma = 0, resto;
    for (var i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (var i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  }

  window.SantosMasks = {
    cpf: mascaraCPF,
    telefone: mascaraTelefone,
    validarCPF: validarCPF
  };
})();
