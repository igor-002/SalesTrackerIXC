export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export type UF = typeof UFS[number]

export const AVATAR_COLORS = [
  '#2563eb', '#3b82f6', '#06b6d4', '#0891b2',
  '#10b981', '#059669', '#f59e0b', '#d97706',
  '#ef4444', '#dc2626', '#ec4899', '#db2777',
  '#6366f1', '#4f46e5', '#14b8a6', '#0d9488',
]

export function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) || 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
