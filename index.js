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
  const result = await pool.query("SELECT * FROM usuario WHERE iddocumento = $1 LIMIT 1", [idIngresado]);
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

async function validarTipo() {
  if (usuarioActual.idtipousuario == 1) {
    return "Masajista";
  } else if (usuarioActual.idtipousuario == 2) {
    return "Administrador";
  } else if (usuarioActual.idtipousuario == 3) {
    return "Director";
  } else {
    return "Ciclista";
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
    return res.json(await validarTipo());
  } catch (error) {
    console.error(error);
    // Aquí puedes agregar manejo de errores más específico basado en el error devuelto
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

app.post("/registro", async (req, res) => {
  const sql = "INSERT INTO usuario (IDDOCUMENTO, IDTIPOUSUARIO, IDTIPOCONTEXTURA, IDPAIS, IDESPECIALIDAD, IDESCUADRA, TIPODOCUMENTOUSUARIO, NOMBREUSUARIO, APELLIDOUSUARIO, GENEROUSUARIO, CORREOUSUARIO, CONTRASENAUSUARIO, PESOUSUARIO, POTENCIAUSUARIO, ACELARACIONUSUARIO, VELOCIDADPROMEDIOUSUARIO, VELOCIDADMAXIMAUSUARIO, TIEMPOCICLISTA, ANOSEXPERIENCIA, GRADORAMPA) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
  pool.query(sql, [req.body.iddocumento, req.body.idtipousuario, req.body.idtipocontextura, req.body.idpais, req.body.idespecialidad, req.body.idescuadra, req.body.tipodocumentousuario, req.body.nombreusuario, req.body.apellidousuario, req.body.generousuario, req.body.correousuario, req.body.contrasenausuario, req.body.pesousuario, req.body.potenciausuario, req.body.acelaracionusuario, req.body.velocidadpromediousuario, req.body.velocidadmaximausuario, req.body.tiempociclista, req.body.anosexperiencia, req.body.gradorampa], (err, result) => {
    if (err) {
      return res.json({ message: "Error al realizar el registro. Intente de nuevo." });
    }
  });
  return res.json({ message: "Registro exitoso." });
});
//VAlida tipo de usuario loggueado y construye los json con los datos del perfil requeridos
async function ValidarDatosPerfil(res) {
  switch (await validarTipo()) {
    //devuelve así: tipo usuario, nombre, apellido, iddocumento, correo, telefono, dirección, idpais, idescuadra, años experiencia
    case "Masajista":
      res.json({
        idtipousuario: usuarioActual.idtipousuario,
        nombreusuario: usuarioActual.nombreusuario,
        apellidousuario: usuarioActual.apellidousuario,
        iddocumento: usuarioActual.iddocumento,
        correousuario: usuarioActual.correousuario,
        telefonousuario: usuarioActual.telefonousuario,
        direccionusuario: usuarioActual.direccionusuario,
        idpais: usuarioActual.idpais,
        idescuadra: usuarioActual.idescuadra,
        anosexperiencia: usuarioActual.anosexperiencia
      });
      break;
    //devuelve así: tipo usuario, nombre, apellido, iddocumento, correo, telefono, dirección, idpais, idescuadra, años experiencia
    case "Director":
      res.json({
        idtipousuario: usuarioActual.idtipousuario,
        nombreusuario: usuarioActual.nombreusuario,
        apellidousuario: usuarioActual.apellidousuario,
        iddocumento: usuarioActual.iddocumento,
        correousuario: usuarioActual.correousuario,
        telefonousuario: usuarioActual.telefonousuario,
        direccionusuario: usuarioActual.direccionusuario,
        idpais: usuarioActual.idpais,
        idescuadra: usuarioActual.idescuadra,
        anosexperiencia: usuarioActual.anosexperiencia
      });
      break;
    //devuelve así: tipo usuario, nombre, apellido, iddocumento, correo, telefono, dirección, idpais, idescuadra, idtipocontextura, idespecialidad, genero, peso, potencia, aceleracion, velocidadpromedio, velocidadmaxima, tiempociclista, años experiencia, gradorampa
    case "Ciclista":
      res.json({
        idtipousuario: usuarioActual.idtipousuario,
        nombreusuario: usuarioActual.nombreusuario,
        apellidousuario: usuarioActual.apellidousuario,
        iddocumento: usuarioActual.iddocumento,
        correousuario: usuarioActual.correousuario,
        telefonousuario: usuarioActual.telefonousuario,
        direccionusuario: usuarioActual.direccionusuario,
        idpais: usuarioActual.idpais,
        idescuadra: usuarioActual.idescuadra,
        idtipocontextura: usuarioActual.idtipocontextura,
        idespecialidad: usuarioActual.idespecialidad,
        generousuario: usuarioActual.generousuario,
        pesousuario: usuarioActual.pesousuario,
        potenciausuario: usuarioActual.potenciausuario,
        acelaracionusuario: usuarioActual.acelaracionusuario,
        velocidadpromediousuario: usuarioActual.velocidadpromediousuario,
        velocidadmaximausuario: usuarioActual.velocidadmaximausuario,
        tiempociclista: usuarioActual.tiempociclista,
        anosexperiencia: usuarioActual.anosexperiencia,
        gradorampa: usuarioActual.gradorampa
      });
      break;
    //devuelve así: tipo usuario, nombre, apellido, iddocumento, correo, telefono, dirección, idpais
    case "Administrador":
      res.json({
        idtipousuario: usuarioActual.idtipousuario,
        nombreusuario: usuarioActual.nombreusuario,
        apellidousuario: usuarioActual.apellidousuario,
        iddocumento: usuarioActual.iddocumento,
        correousuario: usuarioActual.correousuario,
        telefonousuario: usuarioActual.telefonousuario,
        direccionusuario: usuarioActual.direccionusuario,
        idpais: usuarioActual.idpais
      });
      break;
    default:
      res.json({ message: "Tipo usuario incorrecto." });
      break;
  }
}

app.get("/perfil/:iddocumento", (req, res) => {
  if (!usuarioActual) {
    return res.status(401).json({ message: "No has iniciado sesión." });
  }

  // Asegurarse de que el iddocumento del usuarioActual coincide con el parámetro de la ruta
  if (req.params.iddocumento !== usuarioActual.iddocumento) {
    return res.status(403).json({ message: "No tienes permiso para ver este perfil." });
  }

  return ValidarDatosPerfil(res);
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

