// server/index.js
import pg from 'pg';
import { config } from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';

config();

const PORT = process.env.PORT || 3001;
const app = express();
let usuarioActual = null;
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

app.use(bodyParser.json());

async function autUsuario(idIngresado, contrasenaIngresada) {
  const result = await pool.query("SELECT * FROM usuario WHERE idusuario = $1 LIMIT 1", [idIngresado]);
  if (result.rows.length > 0) {
    const user = result.rows[0];
    
    usuarioActual = user;    
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
  const result = await pool.query("SELECT * FROM usuario");
  
  // Extraer todas las contraseñas
  const contrasenas = result.rows.map(row => row.contrasenausuario);
  
  return res.json(contrasenas);
});

async function validarTipo(res) {
  if(usuarioActual.idtipousuario == 1){
    return res.json({ message: "Masajista" });
  }else if(usuarioActual.idtipousuario == 2){
    return res.json({ message: "Administrador" });
  }else if(usuarioActual.idtipousuario == 3){
    return res.json({ message: "Director" });
  }else{
    return res.json({ message: "Ciclista" });  
  }
}

app.post("/login", async (req, res) => {
  try {
    const { usuario, password, recaptchaToken } = req.body;

    // Validar que se hayan proporcionado los campos necesarios
    if (!usuario || !password) {
      return res.status(400).json({ message: "Falta el usuario o la contraseña." });
    }
    // Opcional: Descomentar para habilitar la validación del captcha
    // if (!recaptchaToken) {
    //   return res.status(400).json({ message: "Falta el token del captcha." });
    // }
    // const captchaValid = await verifyRecaptcha(recaptchaToken);
    // if (!captchaValid) {
    //   return res.status(400).json({ message: "Fallo en la validación del captcha." });
    // }

    const userAuthenticated = await autUsuario(usuario, password);
    if (!userAuthenticated) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
    }

    //Valida el tipo de usuario que loguea  
    return validarTipo();
  } catch (error) {
    console.error(error);
    // Aquí puedes agregar manejo de errores más específico basado en el error devuelto
    res.status(500).json({ message: "Error interno del servidor." });
  }
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

