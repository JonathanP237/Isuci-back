// server/index.js
import pg from 'pg';
import { config } from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';

config();

const PORT = process.env.PORT || 3001;
const app = express();
const idUsuarioActual = null;
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

app.use(bodyParser.json());

async function authenticateUser(idIngresado, contrasenaIngresada) {
  const result = await pool.query("SELECT * FROM usuario WHERE idusuario = $1 LIMIT 1", [idIngresado]);
  if (result.rows.length > 0) {
    const user = result.rows[0];
    idUsuarioActual = user.idusuario;    
    // Compara la contraseña proporcionada con la contraseña hasheada almacenada
    const passwordMatch = await bcrypt.compare(contrasenaIngresada, user.contrasenausuario);
    return passwordMatch;
  }
  return false;
}



app.get("/api", (req, res) => {
  res.json({ message: "Hello from server!" });
});

app.get("/ping", async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  return res.json(result.rows[0]);
});

app.get("/test", async (req, res) => {
  const result = await pool.query("SELECT * FROM usuario WHERE idtipousuario = 4 AND generousuario = 'M'");
  return res.json(result.rows[0].contrasenausuario);
});

app.post("/login", async (req, res) => {
  //const { usuario, password, recaptchaToken } = req.body;
  const { usuario, password} = req.body;
  // Primero, verifica el captcha
  //const captchaValid = await verifyRecaptcha(recaptchaToken);
  /*if (!captchaValid) {
    return res.status(400).json({ message: "Fallo en la validación del captcha." });
  }*/

  // Luego, verifica las credenciales del usuario
  const userAuthenticated = await authenticateUser(usuario, password);
  if (!userAuthenticated) {
    return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
  }
  // Si todo es correcto, procede con el login
  res.json({ message: "Login exitoso." });
});

app.post("/registro", (req, res) => {
  if (err) {
    return res.json({ message: "Error al realizar el registro. Intente de nuevo." });
  }
  res.json({ message: "Registro exitoso." });
});

app.get("/perfil", (req, res) => {
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

