const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();

// Habilitar o Express a ler JSON
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = ["http://localhost:5173", "http://localhost:4173"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// Mock Banco de Dados
const users = [
  {
    id: 1,
    name: "Wallison Henrique",
    email: "wallisonhen@gmail.com",
    password: "123",
    role: "admin",
    permissions: ["all"],
  },
];

// Rota de Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Simular Autenticação
  const user = users.find((u) => {
    if (u.email === email) {
      return u.password === password;
    }
    return false;
  });

  // Gerar tokens mockados
  const accessToken = `mock-access-token-user-${user.id}-${Date.now()}`;
  const refreshToken = `mock-refresh-token-user-${user.id}-${Date.now()}`;

  // Adicionar refreshToken no Cookie (Inacessível ao JS)
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false, // true em produção com HTTPS
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });

  return res.json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    },
  });
});

// Rota de Renovação de Token
app.post("/api/refresh", (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token ausente no cookie." });
  }

  // Simula Validação de Token
  const tokenParts = refreshToken.split("-");
  const userId = parseInt(tokenParts[4]);
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  // Novo token
  const newAccessToken = `mock-refresh-token-user-${user.id}-${Date.now()}`;

  return res.json({
    accessToken: newAccessToken,
  });
});

app.get("/api/checkout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token && !token.startsWith("mock-access-token")) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }

  return res.json({ message: "Acesso autorizado." });
});

app.listen(3000, () => {
  console.log(
    "API do Workshop rodando na porta 3000 🚀: http://localhost:3000/",
  );
});
