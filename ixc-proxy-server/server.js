import express from 'express'
import cors from 'cors'

const app = express()
const PORT = process.env.PORT || 3001
const IXC_BASE_URL = process.env.IXC_BASE_URL
const IXC_TOKEN = process.env.IXC_TOKEN

if (!IXC_BASE_URL || !IXC_TOKEN) {
  console.error('IXC_BASE_URL e IXC_TOKEN são obrigatórios')
  process.exit(1)
}

app.use(cors({
  origin: ['https://salestracker-crm.vercel.app', 'http://localhost:5173'],
}))
app.use(express.json())

app.post('/ixc/:tabela', async (req, res) => {
  const { tabela } = req.params
  const target = `${IXC_BASE_URL.replace(/\/$/, '')}/webservice/v1/${tabela}`

  try {
    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        Authorization: IXC_TOKEN,
        'Content-Type': 'application/json',
        ixcsoft: 'listar',
      },
      body: JSON.stringify(req.body),
    })
    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
})

app.listen(PORT, () => console.log(`IXC proxy rodando na porta ${PORT}`))
