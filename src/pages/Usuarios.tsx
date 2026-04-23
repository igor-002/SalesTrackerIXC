import { useState } from 'react'
import { Plus, Pencil, PowerOff, Power, ShieldCheck, Shield, Trash2 } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useUsuarios, type UsuarioRow } from '@/hooks/useUsuarios'
import { useVendedores } from '@/hooks/useVendedores'
import { toast } from '@/components/ui/Toast'
import { type Permissoes, PERMISSOES_DEFAULT, PERMISSAO_LABELS } from '@/types/permissoes'

// ── Modal ──────────────────────────────────────────────────────────────────

interface ModalProps {
  usuario: UsuarioRow | null
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg rounded-lg flex flex-col max-h-[90vh] bg-white border border-[#e4e4e7] shadow-xl">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0 border-b border-[#e4e4e7]">
          <h3 className="text-base font-bold text-[#09090b]">
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          <button onClick={onClose} className="text-[#a1a1aa] hover:text-[#09090b] text-xl cursor-pointer leading-none">×</button>
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

            {/* Vendedor IXC */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#71717a]">
                Vincular ao Vendedor
              </label>
              <select
                value={idVendedorIxc}
                onChange={(e) => setIdVendedorIxc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md text-sm text-[#09090b] outline-none cursor-pointer bg-white border border-[#e4e4e7] focus:border-[#09090b] focus:ring-2 focus:ring-[#09090b]/10"
              >
                <option value="">— Nenhum —</option>
                {vendedoresAtivos.map((v) => (
                  <option key={v.id} value={v.ixc_id ?? v.id}>
                    {v.nome} {v.ixc_id ? `(IXC #${v.ixc_id})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#a1a1aa]">Restringe Clientes apenas às vendas deste vendedor.</p>
            </div>

            {/* Permissões */}
            <div>
              <p className="text-xs font-medium text-[#71717a] mb-3">
                Permissões de acesso
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PERMISSAO_LABELS) as (keyof Permissoes)[]).map((key) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors"
                    style={{
                      background: perms[key] ? '#f0fdf4' : '#f4f4f5',
                      border: `1px solid ${perms[key] ? '#bbf7d0' : '#e4e4e7'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={perms[key]}
                      onChange={() => togglePerm(key)}
                      className="w-4 h-4 rounded accent-[#15803d] cursor-pointer"
                    />
                    <span className="text-sm font-medium" style={{ color: perms[key] ? '#15803d' : '#71717a' }}>
                      {PERMISSAO_LABELS[key]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-[#b91c1c] text-center">{error}</p>}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end gap-3 flex-shrink-0 border-t border-[#e4e4e7]">
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
          <h2 className="text-xl font-bold text-[#09090b]">Gerenciar Usuários</h2>
          <p className="text-sm text-[#71717a] font-medium">Perfis de acesso e permissões</p>
        </div>
        <Button onClick={abrirNovo}>
          <Plus size={15} className="mr-1.5" />
          Novo Usuário
        </Button>
      </div>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Shield size={36} className="text-[#a1a1aa]" />
            <p className="text-sm text-[#71717a]">Nenhum usuário cadastrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e4e4e7] bg-[#fafafa]">
                {['Nome', 'Email', 'Vendedor IXC', 'Admin', 'Status', 'Ações'].map((col) => (
                  <th key={col} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717a]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr
                  key={u.id}
                  className="transition-colors hover:bg-[#fafafa]"
                  style={{ borderBottom: i < usuarios.length - 1 ? '1px solid #f4f4f5' : undefined }}
                >
                  <td className="px-5 py-3.5 font-semibold text-[#09090b]">{u.nome}</td>
                  <td className="px-5 py-3.5 text-[#71717a]">{u.email}</td>
                  <td className="px-5 py-3.5 text-[#71717a]">
                    {u.id_vendedor_ixc
                      ? <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]">#{u.id_vendedor_ixc}</span>
                      : <span className="text-[#a1a1aa]">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {u.permissoes?.admin ? (
                      <ShieldCheck size={16} className="text-[#15803d]" />
                    ) : (
                      <Shield size={16} className="text-[#a1a1aa]" />
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-md"
                      style={u.ativo
                        ? { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
                        : { background: '#f4f4f5', color: '#71717a', border: '1px solid #e4e4e7' }
                      }
                    >
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="p-1.5 rounded-md text-[#a1a1aa] hover:text-[#09090b] hover:bg-[#f4f4f5] transition-colors cursor-pointer"
                        title="Editar permissões"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleAtivo(u)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          u.ativo
                            ? 'text-[#a1a1aa] hover:text-[#b91c1c] hover:bg-[#fef2f2]'
                            : 'text-[#a1a1aa] hover:text-[#15803d] hover:bg-[#f0fdf4]'
                        }`}
                        title={u.ativo ? 'Desativar usuário' : 'Reativar usuário'}
                      >
                        {u.ativo ? <PowerOff size={14} /> : <Power size={14} />}
                      </button>
                      <button
                        onClick={() => setConfirmandoDelete(u)}
                        className="p-1.5 rounded-md text-[#a1a1aa] hover:text-[#b91c1c] hover:bg-[#fef2f2] transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-sm rounded-lg p-6 flex flex-col gap-5 bg-white border border-[#fecaca] shadow-xl">
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-bold text-[#09090b]">Excluir usuário?</p>
              <p className="text-sm text-[#71717a]">
                <span className="text-[#09090b] font-medium">{confirmandoDelete.nome}</span> será removido permanentemente do sistema e não poderá mais fazer login.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmandoDelete(null)}
                className="px-4 py-2 rounded-md text-sm font-medium text-[#71717a] hover:text-[#09090b] transition-colors cursor-pointer bg-[#f4f4f5] border border-[#e4e4e7]"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmandoDelete)}
                className="px-4 py-2 rounded-md text-sm font-bold cursor-pointer transition-opacity hover:opacity-80 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c]"
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
