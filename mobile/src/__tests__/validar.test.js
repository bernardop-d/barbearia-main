import { validarAgendamento } from '../utils/validar'

const hoje = new Date().toISOString().slice(0, 10)
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

function form(overrides = {}) {
  return { nome: 'João Silva', data: hoje, whatsapp: '', ...overrides }
}

describe('validarAgendamento', () => {
  describe('nome', () => {
    test('vazio retorna erro', () => {
      expect(validarAgendamento(form({ nome: '' }), 9)).toBe('Informe seu nome.')
    })

    test('só espaços retorna erro', () => {
      expect(validarAgendamento(form({ nome: '   ' }), 9)).toBe('Informe seu nome.')
    })

    test('nome com 1 letra retorna erro', () => {
      expect(validarAgendamento(form({ nome: 'J' }), 9)).toBe('Nome muito curto.')
    })

    test('nome com números retorna erro', () => {
      expect(validarAgendamento(form({ nome: 'João2' }), 9)).toBe('Nome inválido (só letras).')
    })

    test('nome com caracteres especiais retorna erro', () => {
      expect(validarAgendamento(form({ nome: 'Jo@o' }), 9)).toBe('Nome inválido (só letras).')
    })

    test('nome válido com acentos é aceito', () => {
      expect(validarAgendamento(form({ nome: 'Ângelo Dütra' }), 9)).toBeNull()
    })

    test('nome válido com espaço é aceito', () => {
      expect(validarAgendamento(form({ nome: 'Maria Clara' }), 9)).toBeNull()
    })
  })

  describe('data', () => {
    test('data vazia retorna erro', () => {
      expect(validarAgendamento(form({ data: '' }), 9)).toBe('Escolha a data.')
    })

    test('data passada retorna erro', () => {
      expect(validarAgendamento(form({ data: ontem }), 9)).toBe('Data inválida.')
    })

    test('data de hoje é aceita', () => {
      expect(validarAgendamento(form({ data: hoje }), 9)).toBeNull()
    })

    test('data futura é aceita', () => {
      expect(validarAgendamento(form({ data: amanha }), 9)).toBeNull()
    })
  })

  describe('hora', () => {
    test('hora null retorna erro', () => {
      expect(validarAgendamento(form(), null)).toBe('Escolha um horário.')
    })

    test('hora undefined retorna erro', () => {
      expect(validarAgendamento(form(), undefined)).toBe('Escolha um horário.')
    })

    test('hora 0 (meia-noite) é aceita', () => {
      expect(validarAgendamento(form(), 0)).toBeNull()
    })

    test('hora válida é aceita', () => {
      expect(validarAgendamento(form(), 10)).toBeNull()
    })
  })

  describe('whatsapp', () => {
    test('whatsapp vazio é opcional', () => {
      expect(validarAgendamento(form({ whatsapp: '' }), 9)).toBeNull()
    })

    test('número muito curto retorna erro', () => {
      expect(validarAgendamento(form({ whatsapp: '1199999' }), 9)).toBe('WhatsApp inválido.')
    })

    test('número muito longo retorna erro', () => {
      expect(validarAgendamento(form({ whatsapp: '119999999999' }), 9)).toBe('WhatsApp inválido.')
    })

    test('DDD menor que 11 retorna erro', () => {
      expect(validarAgendamento(form({ whatsapp: '(01) 99999-9999' }), 9)).toBe('DDD inválido.')
    })

    test('DDD 10 retorna erro', () => {
      expect(validarAgendamento(form({ whatsapp: '10999999999' }), 9)).toBe('DDD inválido.')
    })

    test('número com máscara válido é aceito', () => {
      expect(validarAgendamento(form({ whatsapp: '(11) 99999-9999' }), 9)).toBeNull()
    })

    test('número sem máscara válido é aceito', () => {
      expect(validarAgendamento(form({ whatsapp: '11999999999' }), 9)).toBeNull()
    })

    test('número fixo 10 dígitos é aceito', () => {
      expect(validarAgendamento(form({ whatsapp: '1133334444' }), 9)).toBeNull()
    })
  })

  describe('formulário completo válido', () => {
    test('retorna null quando tudo está correto', () => {
      expect(validarAgendamento(
        { nome: 'Pedro Alves', data: amanha, whatsapp: '(21) 98765-4321' },
        14
      )).toBeNull()
    })
  })
})
