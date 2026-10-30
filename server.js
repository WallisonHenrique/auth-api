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
    name: "Admin",
    email: "admin@ecommerce.com",
    password: "admin",
    role: "admin",
    permissions: ["approve:transaction"],
  },
  {
    id: 2,
    name: "Customer",
    email: "customer@ecommerce.com",
    password: "customer",
    role: "customer",
    permissions: [],
  },
];
const addresses = [
  {
    id: 1,
    userId: 2,
    street: "Av. Paulista, 1000",
    city: "São Paulo - SP",
    is_primary: true,
  },
];
const coupons = [{ id: 1, userId: 2, code: "PRIMEIRACOMPRA", discount: 15 }];

// Simula Redis/DB
const activeAccessTokens = new Map();
const activeRefreshTokens = new Map();

// Rota de Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Simular Autenticação
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Email ou senha inválida." });
  }

  // Gerar tokens mockados
  const accessToken = `at_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const refreshToken = `rt_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Salva tokens simulando Redis/DB
  activeAccessTokens.set(accessToken, {
    userId: user.id,
    expiresAt: Date.now() + 30 * 1000,
  });
  activeRefreshTokens.set(refreshToken, { userId: user.id, revoked: false });

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
    return res.status(401).json({ error: "Cookie ou Refresh Token ausentes." });
  }

  // Simula Validação de Token
  const tokenData = activeRefreshTokens.get(refreshToken);
  if (!tokenData) {
    return res.status(401).json({ error: "Refresh Token inválido." });
  }

  // Detecta reutilização (usado ou revogado)
  if (tokenData.revoked) {
    //Revogar toda a sessão do usuário por segurança
    activeRefreshTokens.forEach((rt) => {
      if (rt.userId === tokenData.userId) rt.revoked = true;
    });
    return res.status(401).json({
      error:
        "Tentativa de reutilização de Refresh Token. Sessão revogada por completo.",
    });
  }

  // Invalida Refresh Token atual imediatamente
  tokenData.revoked = true;

  // Verifica se usuário existe
  const user = users.find((u) => u.id === tokenData.userId);
  if (!user) {
    return res.status(401).json({ error: "Usuário inválido." });
  }

  // Novos tokens
  const newAccessToken = `at_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const newRefreshToken = `rt_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: false, // true em produção com HTTPS
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });

  return res.json({
    accessToken: newAccessToken,
  });
});

// Middleware de Autenticação
const requireAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Token ausente." });
  }

  // Validação do token
  const tokenData = activeAccessTokens.get(token);
  if (!tokenData || Date.now() > tokenData.expiresAt) {
    if (tokenData) activeAccessTokens.delete(token);
    return res
      .status(401)
      .json({ error: "Access Token inválido ou expirado." });
  }

  req.userId = tokenData.userId;
  next();
};

app.get("/api/checkout/address", requireAuth, (req, res) => {
  const result = addresses.find((a) => a.userId === req.userId);
  return res.json(result);
});

app.get("/api/checkout/coupons", requireAuth, (req, res) => {
  const result = coupons.filter((a) => a.userId === req.userId);
  return res.json(result);
});

app.listen(3000, () => {
  console.log("API cart-web-vite rodando em: http://localhost:3000");
});
