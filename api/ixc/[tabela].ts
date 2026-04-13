import type { VercelRequest, VercelResponse } from '@vercel/node'

const IXC_BASE_URL = process.env.VITE_IXC_BASE_URL  // URL pública, ok com prefixo VITE_
const IXC_TOKEN    = process.env.IXC_TOKEN           // credencial — sem VITE_, fica só no servidor

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!IXC_BASE_URL || !IXC_TOKEN) {
    return res.status(500).json({ error: 'IXC não configurado no servidor' })
  }

  const tabela = req.query.tabela as string
  const target = `${IXC_BASE_URL.replace(/\/$/, '')}/webservice/v1/${tabela}`

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: IXC_TOKEN,
        'Content-Type': 'application/json',
        ixcsoft: 'listar',
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return res.status(502).json({ error: msg })
  }
}
