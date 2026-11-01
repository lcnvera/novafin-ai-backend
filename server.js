import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || false
}));
app.use(express.json({ limit: "20kb" }));

app.use("/api/", rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

const instructions = `
Você é a NovaFin Intelligence, assistente educativa da NovaFin AI.
Responda em português do Brasil, com acolhimento, clareza e paciência.
Explique orçamento, juros compostos, inflação, metas, reserva de emergência,
diversificação e prevenção a golpes usando exemplos simples.

A NovaFin AI é um protótipo educativo, não é banco, corretora ou consultoria.
Nunca trate simulações como dinheiro real, saldo, depósitos ou investimentos.
Não peça senhas, códigos, dados bancários, documentos ou dados financeiros sensíveis.
Não execute transações, prometa retornos ou recomende ativos específicos.
Explique riscos e sugira profissional habilitado para decisões pessoais.
Se não souber algo, diga com transparência.
`;

app.get("/", (_req, res) => {
  res.json({
    service: "NovaFin AI Backend",
    status: "online",
    note: "Protótipo educativo. Nenhuma operação financeira real."
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "A integração com a IA ainda não foi configurada."
      });
    }

    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Envie uma conversa válida."
      });
    }

    const safeMessages = messages
      .slice(-12)
      .filter(m =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
      )
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 3000)
      }));

    if (
      !safeMessages.length ||
      safeMessages[safeMessages.length - 1].role !== "user"
    ) {
      return res.status(400).json({
        error: "A última mensagem deve ser do usuário."
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-6-astra",
      instructions,
      input: safeMessages,
      max_output_tokens: 700
    });

    res.json({
      reply: response.output_text || "Não consegui responder agora."
    });

  } catch (error) {
    console.error("Erro em /api/chat:", error?.message || error);

    res.status(500).json({
      error: "A assistente está temporariamente indisponível. Tente novamente."
    });
  }
});

app.listen(PORT, () => {
  console.log(`NovaFin AI Backend ouvindo na porta ${PORT}`);
});
