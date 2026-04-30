import { useState } from 'react'
import { Plus, Pencil, PowerOff, Power, ShieldCheck, Shield, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUsuarios, type UsuarioRow } from '@/hooks/useUsuarios'
import { useVendedores } from '@/hooks/useVendedores'
import { toast } from '@/components/ui/Toast'
import { type Permissoes, PERMISSOES_DEFAULT, PERMISSOES_ADMIN, PERMISSOES_VENDEDOR, PERMISSAO_LABELS } from '@/types/permissoes'

// ── Modal ──────────────────────────────────────────────────────────────────

interface ModalProps {
  usuario: UsuarioRow | null  // null = criar novo
  onClose: () => void
  onSave: (data: {
    nome: string
    email: string
    senha: string
    id_vendedor_ixc: string | null
    permissoes: Permissoes
  }) => Promise<void>
  onUpdate: (id: string, data: {
    nome: string
    id_vendedor_ixc: string | null
    permissoes: Permissoes
  }) => Promise<void>
  onUpdateSenha: (user_id: string, novaSenha: string) => Promise<void>
  vendedores: { id: string; nome: string; ixc_id: string | null; ativo: boolean | null }[]
}

function UsuarioModal({ usuario, onClose, onSave, onUpdate, onUpdateSenha, vendedores }: ModalProps) {
  const isEditing = !!usuario

  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [senha, setSenha] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [idVendedorIxc, setIdVendedorIxc] = useState(usuario?.id_vendedor_ixc ?? '')
  const [perms, setPerms] = useState<Permissoes>(
    usuario?.permissoes ?? { ...PERMISSOES_DEFAULT }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function togglePerm(key: keyof Permissoes) {
    setPerms((p) => ({ ...p, [key]: !p[key] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (isEditing) {
        await onUpdate(usuario.id, {
          nome,
          id_vendedor_ixc: idVendedorIxc || null,
          permissoes: perms,
        })
        if (novaSenha) {
          if (novaSenha.length < 6) {
            setError('A nova senha deve ter ao menos 6 caracteres.')
            setSaving(false)
            return
          }
          if (!usuario.user_id) throw new Error('user_id ausente — impossível alterar senha.')
          await onUpdateSenha(usuario.user_id, novaSenha)
        }
        toast('success', 'Usuário atualizado com sucesso.')
      } else {
        if (!senha || senha.length < 6) {
          setError('A senha deve ter ao menos 6 caracteres.')
          setSaving(false)
          return
        }
        await onSave({
          nome,
          email,
          senha,
          id_vendedor_ixc: idVendedorIxc || null,
          permissoes: perms,
        })
        toast('success', 'Usuário criado com sucesso.')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar usuário.')
    } finally {
      setSaving(false)
    }
  }

  const vendedoresAtivos = vendedores.filter((v) => v.ativo)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: '#0f1f14', border: '1px solid rgba(0,214,143,0.2)' }}
      >
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h3 className="text-base font-bold text-white">
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white text-xl cursor-pointer leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              {!isEditing && (
                <>
                  <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Input label="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mín. 6 caracteres" required />
                </>
              )}
              {isEditing && (
                <div className="col-span-2">
                  <Input
                    label="Nova Senha (deixe em branco para manter)"
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mín. 6 caracteres"
                  />
                </div>
              )}
            </div>

            {/* Perfil rápido */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Perfil de acesso
              </p>
              <div className="flex gap-2">
                {([
                  { label: 'Vendedor', preset: PERMISSOES_VENDEDOR, color: '#06b6d4' },
                  { label: 'Administrador', preset: PERMISSOES_ADMIN, color: '#00d68f' },
                ] as const).map(({ label, preset, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPerms({ ...preset })}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(255,255,255,0.1)`,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.color = color }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                  >
                    Aplicar perfil {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/25">Atalho para preencher as permissões abaixo. Você pode ajustar depois.</p>
            </div>

            {/* Vendedor IXC */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Vincular ao Vendedor
              </label>
              <select
                value={idVendedorIxc}
                onChange={(e) => setIdVendedorIxc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none cursor-pointer"
                style={{
                  background: '#0f1f14',
                  border: '1px solid rgba(255,255,255,0.1)',
                  colorScheme: 'dark',
                }}
              >
                <option value="">— Nenhum —</option>
                {vendedoresAtivos.map((v) => (
                  <option key={v.id} value={v.ixc_id ?? v.id}>
                    {v.nome} {v.ixc_id ? `(IXC #${v.ixc_id})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/30">
                {idVendedorIxc
                  ? 'Vendedor vinculado — usuário verá apenas seus próprios dados nos Relatórios.'
                  : 'Restringe Relatórios e Clientes apenas às vendas deste vendedor.'}
              </p>
            </div>

            {/* Permissões */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Permissões de acesso
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PERMISSAO_LABELS) as (keyof Permissoes)[]).map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: perms[key] ? 'rgba(0,214,143,0.1)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${perms[key] ? 'rgba(0,214,143,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={perms[key]}
                      onChange={() => togglePerm(key)}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium" style={{ color: perms[key] ? '#00d68f' : 'rgba(255,255,255,0.55)' }}>
                      {PERMISSAO_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving}>Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function Usuarios() {
  const { usuarios, loading, createUsuario, updateUsuario, updateSenha, toggleAtivo, deleteUsuario } = useUsuarios()
  const { vendedores } = useVendedores()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<UsuarioRow | null>(null)
  const [confirmandoDelete, setConfirmandoDelete] = useState<UsuarioRow | null>(null)

  function abrirNovo() {
    setEditando(null)
    setModalOpen(true)
  }

  function abrirEditar(u: UsuarioRow) {
    setEditando(u)
    setModalOpen(true)
  }

  async function handleDelete(u: UsuarioRow) {
    try {
      await deleteUsuario(u.id, u.user_id)
      toast('success', 'Usuário excluído.')
    } catch {
      toast('error', 'Erro ao excluir usuário.')
    } finally {
      setConfirmandoDelete(null)
    }
  }

  async function handleToggleAtivo(u: UsuarioRow) {
    try {
      await toggleAtivo(u.id, !u.ativo)
      toast('success', u.ativo ? 'Usuário desativado.' : 'Usuário reativado.')
    } catch {
      toast('error', 'Erro ao alterar status do usuário.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Gerenciar Usuários</h2>
          <p className="text-sm text-white/40 font-medium">Perfis de acesso e permissões</p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={15} className="mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner style={{ color: '#00d68f' }} />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Shield size={36} className="text-white/15" />
            <p className="text-sm text-white/30">Nenhum usuário cadastrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Nome', 'Email', 'Vendedor IXC', 'Perfil', 'Status', 'Ações'].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-white/30">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-white/3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <td className="px-5 py-3.5 font-semibold text-white">{u.nome}</td>
                  <td className="px-5 py-3.5 text-white/50">{u.email}</td>
                  <td className="px-5 py-3.5 text-white/40">
                    {u.id_vendedor_ixc
                      ? <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(0,214,143,0.1)', color: '#00d68f' }}>#{u.id_vendedor_ixc}</span>
                      : <span className="text-white/20">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {u.permissoes?.admin ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <ShieldCheck size={14} />
                        Admin
                      </span>
                    ) : u.id_vendedor_ixc ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                        <Shield size={14} />
                        Vendedor
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-white/20">
                        <Shield size={14} />
                        Padrão
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={u.ativo
                        ? { background: 'rgba(0,214,143,0.12)', color: '#00d68f', border: '1px solid rgba(0,214,143,0.2)' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }
                      }
                    >
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
                        title="Editar permissões"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(u)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          u.ativo
                            ? 'text-white/30 hover:text-red-400 hover:bg-red-500/8'
                            : 'text-white/30 hover:text-emerald-400 hover:bg-emerald-500/8'
                        }`}
                        title={u.ativo ? 'Desativar usuário' : 'Reativar usuário'}
                      >
                        {u.ativo ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                      <button
                        onClick={() => setConfirmandoDelete(u)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/8 transition-colors cursor-pointer"
                        title="Excluir usuário"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>

      {confirmandoDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
            style={{ background: '#0f1f14', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-bold text-white">Excluir usuário?</p>
              <p className="text-sm text-white/50">
                <span className="text-white/80 font-medium">{confirmandoDelete.nome}</span> será removido permanentemente do sistema e não poderá mais fazer login.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmandoDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-colors cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmandoDelete)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <UsuarioModal
          usuario={editando}
          onClose={() => setModalOpen(false)}
          onSave={createUsuario}
          onUpdate={updateUsuario}
          onUpdateSenha={updateSenha}
          vendedores={vendedores}
        />
      )}
    </div>
  )
}
