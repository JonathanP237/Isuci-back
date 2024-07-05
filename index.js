/**
 * This file contains the server-side code for the application.
 * It includes the necessary imports, configurations, and route handlers.
 * The server listens on the specified port and interacts with a PostgreSQL database.
 * The code also includes functions for user authentication, registration, and profile retrieval.
 * @module server/index
 */
// server/index.js
import pg from 'pg';
import { config, parse } from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';

config();

let usuarioLogin = null;
const PORT = process.env.PORT || 3001;
const app = express();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const transporter = nodemailer.createTransport({
  service: 'gmail', // Usa el servicio de correo electrónico que prefieras
  auth: {
    user: process.env.EMAIL_USER, // Correo electrónico del remitente
    pass: process.env.EMAIL_PASS, // Contraseña del correo electrónico del remitente
  },
});
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Mi Proyecto',
      version: '1.0.0',
      description: 'Esta es la documentación de la API de mi proyecto.',
    },
  },
  apis: ['./index.js'], // Ruta a los archivos donde Swagger leerá los comentarios para generar la documentación
};
const swaggerSpec = swaggerJSDoc(options);
const saltRounds = 10;

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(express.json()); //// Esto es crucial
app.use(bodyParser.json());
app.use(cors({
  origin: 'http://localhost:3000',
}));


/**
 * Authenticates a user by checking if the provided ID and password match the stored values.
 * @param {string} usuario - The ID of the user to authenticate.
 * @param {string} contrasenaIngresada - The password of the user to authenticate.
 * @returns {Promise<boolean>} - A promise that resolves to true if the authentication is successful, false otherwise.
 */
async function autUsuario(usuario, contrasenaIngresada) {
  const result = await pool.query("SELECT * FROM usuario WHERE iddocumento = $1 LIMIT 1", [usuario]);
  
  if (result.rows.length > 0) {
    const user = result.rows[0];    
    usuarioLogin = user;
    console.log("Usuario actual: ", usuarioLogin.iddocumento); // Corrige "console.lo0g" a "console.log"
    // Compara la contraseña proporcionada con la contraseña hasheada almacenada
    const passwordMatch = await bcrypt.compare(contrasenaIngresada, user.contrasenausuario);
    if(passwordMatch) {
      // Asegúrate de que usuarioActual tenga la propiedad idtipousuario
      if(usuarioLogin.idtipousuario !== undefined) {
        // Aquí puedes llamar a validarTipo
      } else {
        throw new Error("Usuario actual no válido o idtipousuario no definido");
      }
    }
    return passwordMatch;
  }
  return false;
}

async function hashPasswords() {
  try {
    const users = await pool.query('SELECT idusuario, contrasenausuario FROM usuario'); // Obtener todos los usuarios y sus contraseñas

    for (let user of users.rows) {
      const hashedPassword = await bcrypt.hash(user.contrasenausuario, saltRounds); // Hashear la contraseña
      await pool.query('UPDATE usuario SET contrasenausuario = $1 WHERE idusuario = $2', [hashedPassword, user.idusuario]); // Actualizar la contraseña hasheada en la base de datos
    }

    console.log('Todas las contraseñas han sido hasheadas y actualizadas.');
  } catch (error) {
    console.error('Error al hashear las contraseñas:', error);
  }
}

app.get("/api", (req, res) => {
  hashPasswords()
  res.json({ message: "Hello from server!" });
});

app.get("/ping", async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  return res.json(result.rows[0]);
});

app.get("/test", async (req, res) => {
  const result = await pool.query("SELECT * FROM usuario");
  const contrasenas = result.rows.map(row => row.contrasenausuario);
  return res.json(contrasenas);
});

/**
 * Validates the type of the current user.
 * @returns {string} The type of the user.
 */
async function validarTipo(usuarioLogin) {
  const idTipo = parseInt(usuarioLogin.idtipousuario, 10);
  if (!usuarioLogin) {
    throw new Error("Usuario actual no válido o idtipousuario no definido");
  }

  const tiposDeUsuario = {
    1: "Masajista",
    2: "Administrador",
    3: "Director"
  };

  return tiposDeUsuario[usuarioLogin.idtipousuario] || "Ciclista";
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
    //Valida el tipo de usuario que logueaa  
    return res.json(await validarTipo(usuarioLogin));
  } catch (error) {
    console.error(error);
    // Aquí puedes agregar manejo de errores más específico basado en el error devuelto
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

/**
 * Sends a confirmation email to the specified email address.
 * @param {string} emailDestino - The destination email address.
 * @returns {Promise<void>} - A promise that resolves when the email is sent successfully, or rejects with an error if there was a problem sending the email.
 */
async function enviarCorreoConfirmacion(emailDestino) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emailDestino,
    subject: 'Confirmación de Registro a ISUCI',
    text: '¡Tu registro ha sido exitoso! Bienvenido a nuestra plataforma desde ahora puedes hacer uso de todas nuestras funcionalidades.',
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Correo de confirmación enviado');
  } catch (error) {
    console.error('Error al enviar el correo de confirmación:', error);
  }
}
/**
 * @swagger
 * /registro:
 *    post:
 *      summary: Registra un nuevo usuario en la aplicación.
 *      description: Este endpoint permite registrar un nuevo usuario en la aplicación.
 *      requestBody:
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *          type: object
 *          properties:
 *           iddocumento:
 *            type: string
 *            description: El ID del usuario.
 *            example: 123456789
 *           idtipousuario:
 *            type: number
 *            description: El tipo de usuario.
 *            example: 1
 *           idtipocontextura:
 *            type: number
 *            description: El tipo de contextura del usuario.
 *            example: 1
 *           idpais:
 *            type: number
 *            description: El país del usuario.
 *            example: 1
 *           idespecialidad:
 *            type: number
 *            description: La especialidad del usuario.
 *            example: 1
 *           idescuadra:
 *            type: number
 *            description: La escuadra del usuario.
 *            example: 1
 *           tipodocumentousuario:
 *            type: string
 *            description: El tipo de documento del usuario.
 *            example: "CC"
 *           nombreusuario:
 *            type: string
 *            description: El nombre del usuario.
 *            example: "Juan"
 *           apellidousuario:
 *            type: string
 *            description: El apellido del usuario.
 *            example: "Pérez"
 *           generousuario:
 *            type: string
 *            description: El género del usuario.
 *            example: "M"
 *           correousuario:
 *            type: string
 *            description: El correo del usuario.
 *            example: "asd@correo.com"
 *           contrasenausuario:
 *            type: string
 *            description: La contraseña del usuario.
 *            example: "password123"
 *           pesousuario:
 *            type: number
 *            description: El peso del usuario.
 *            example: 70
 *           potenciausuario:
 *            type: number
 *            description: La potencia del usuario.
 *            example: 200
 *           acelaracionusuario:
 *            type: number
 *            description: La aceleración del usuario.
 *            example: 10
 *           velocidadpromediousuario:
 *            type: number
 *            description: La velocidad promedio del usuario.
 *            example: 20
 *           velocidadmaximausuario:
 *            type: number
 *            description: La velocidad máxima del usuario.
 *            example: 30
 *           tiempociclista:
 *            type: number
 *            description: El tiempo del ciclista.
 *            example: 10
 *           anosexperiencia:
 *            type: number
 *            description: Los años de experiencia del usuario.
 *            example: 5
 *           gradorampa:
 *            type: number 
 *            description: El grado de la rampa.
 *            example: 5
 *      responses:
 *       200:
 *         description: Registro exitoso.
 *       500:
 *         description: Error al realizar el registro. Intente de nuevo.
 * 
 * 
 */
async function validarCantidadRegistros(){
  try {
    const result = await pool.query("SELECT COUNT(*) FROM usuario");
    const cantidadRegistros = result.rows[0].count;
    return cantidadRegistros;
  } catch (error) {
    console.error(error.message);
    return error.message;
  }
}

async function validarTipoUsuario(tipousuario){
  try {
    const result = await pool.query("SELECT * FROM tipousuario WHERE destipousuario = $1 LIMIT 1", [tipousuario]);
    if (result.rows.length === 0) {
      throw new Error("No registra tipo usuario");
    }
    
    const tiposDeUsuario = {
      "Masajista": 1,
      "Administrador": 2,
      "Director de escuadra": 3,
      "Ciclista": 4
    };
  
    return tiposDeUsuario[tipousuario];
  }catch (error) {
    console.error(error.message);
    return error.message;
  }
}

app.post("/registro", async (req, res) => {
  const { contrasenausuario } = req.body;
  const {tipousuario} = req.body;
  const {idtipousuario} = await validarTipoUsuario(tipousuario);
  console.log(tipousuario);
  try {
    // Hashing de la contraseña
    const hashedPassword = await bcrypt.hash(contrasenausuario, saltRounds);
    
    const sql = ` 
      INSERT INTO USUARIO (
        IDUSUARIO, IDDOCUMENTO, IDTIPOUSUARIO, IDTIPOCONTEXTURA, IDESPECIALIDAD, IDESCUADRA, DOCUMENTOUSUARIO, 
        NOMBREUSUARIO, APELLIDOUSUARIO, GENEROUSUARIO, FECHANACIMIENTO, CORREOUSUARIO, CONTRASENAUSUARIO, NACIONALIDAD, 
        PESOUSUARIO, POTENCIAUSUARIO, ACELARACIONUSUARIO, VELOCIDADPROMEDIOUSUARIO, VELOCIDADMAXIMAUSUARIO, TIEMPOCICLISTA, FECHAINICIOCARRERA, GRADORAMPA
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `;

    const valores = [
      parseInt(req.body.iddocumento,10), parseInt(req.body.iddocumento,10), parseInt(idtipousuario,10), null, null, null, req.body.documentousuario, req.body.nombreusuario,
      req.body.apellidousuario, req.body.generousuario, req.body.fechanacimiento, req.body.correousuario, hashedPassword, 
      req.body.nacionalidad, null, null, null, null, null, null, req.body.fechainiciocarrera, null
    ];

    await pool.query(sql, valores);
    res.json({ message: "Registro exitoso." });
    await enviarCorreoConfirmacion(req.body.correousuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al realizar el registro. Intente de nuevo." });
  }
});


/**
 * Validates user profile data based on the user's type and returns the corresponding data.
 * @param {object} res - The response object used to send the JSON response.
 * @returns {void}
 */
/*async function ValidarDatosPerfil(res) {
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
}*/
//
async function ValidarEspecialidad(idespecialidad){
  try {
    const result = await pool.query("SELECT * FROM especialidades WHERE idespecialidad = $1 LIMIT 1", [idespecialidad]);
    if (result.rows.length === 0) {
      throw new Error("Especialidad no encontrada");
    }
    const nombreEspecialidad = result.rows[0].desespecialidad;
    return nombreEspecialidad;
  } catch (error) {
    // Aquí puedes manejar el error como prefieras, por ejemplo, devolver un mensaje de error
    console.error(error.message);
    return "No registrado en ninguna"; // O manejarlo de otra manera
  }
}

async function ValidarNombreEscuadra(idescuadra){
  try {
    const result = await pool.query("SELECT * FROM escuadras WHERE idescuadra = $1 LIMIT 1", [idescuadra]);
    if (result.rows.length === 0) {
      throw new Error("No registra escuadra");
    }
    const nombreEscuadra = result.rows[0].desescuadra;
    return nombreEscuadra;
  } catch (error) {
    // Aquí puedes manejar el error como prefieras, por ejemplo, devolver un mensaje de error
    console.error(error.message);
    return error.message; // O manejarlo de otra manera
  }
}

async function ValidarDatosPerfil1(res) {
  try {    
    const result = await pool.query("SELECT * FROM usuario WHERE iddocumento = $1 LIMIT 1", [usuarioLogin.iddocumento]);
    if (result.rows.length === 0) {
      throw new Error("Usuario no encontrado");
    }
    const usuarioActual = result.rows[0];
    console.log(usuarioActual.idtipousuario);
    const idTipoUsuario = parseInt(usuarioActual.idtipousuario);
    const nombreEscuadra = await ValidarNombreEscuadra(usuarioActual.idescuadra);
    const nombreEspecialidad = await ValidarEspecialidad(usuarioActual.idespecialidad);
    switch (idTipoUsuario) {
      case 1:
      case 3:
        res.json({
          idtipousuario: usuarioActual.idtipousuario,
          nombreusuario: usuarioActual.nombreusuario,
          apellidousuario: usuarioActual.apellidousuario,
          iddocumento: usuarioActual.iddocumento,
          correousuario: usuarioActual.correousuario,
          idpais: usuarioActual.nacionalidad,
          telefonousuario: usuarioActual.telefonousuario,
          direccionusuario: usuarioActual.direccionusuario,
          idescuadra: usuarioActual.idescuadra,
          anosexperiencia: usuarioActual.fechainiciocarrera,
          nombreEscuadra: nombreEscuadra
        });
        break;
      case 4:
        res.json({
          idtipousuario: usuarioActual.idtipousuario,
          nombreusuario: usuarioActual.nombreusuario,
          apellidousuario: usuarioActual.apellidousuario,
          iddocumento: usuarioActual.iddocumento,
          correousuario: usuarioActual.correousuario,
          idpais: usuarioActual.nacionalidad,
          telefonousuario: usuarioActual.telefonousuario,
          direccionusuario: usuarioActual.direccionusuario,
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
          anosexperiencia: usuarioActual.fechainiciocarrera,
          gradorampa: usuarioActual.gradorampa,
          nombreEscuadra: nombreEscuadra,
          nombreEspecialidad: nombreEspecialidad
        });
        break;
      case 2:
        res.json({
          idtipousuario: usuarioActual.idtipousuario,
          nombreusuario: usuarioActual.nombreusuario,
          apellidousuario: usuarioActual.apellidousuario,
          iddocumento: usuarioActual.iddocumento,
          correousuario: usuarioActual.correousuario,
          idpais: usuarioActual.nacionalidad,
          telefonousuario: usuarioActual.telefonousuario,
          direccionusuario: usuarioActual.direccionusuario,
        });
        break;
      default:
        res.json({ message: "Tipo usuario incorrecto." });
        break;
    }
  } catch (error) {
    console.error(error.message);
    res.status(404).json({ message: error.message });
  }
}
/**
 * @swagger
 * /perfil/{iddocumento}:
 *  get:
 *   summary: Obtiene el perfil de un usuario.
 *   description: Este endpoint permite obtener el perfil de un usuario en la aplicación.
 *   requestBody:
 *    required: true
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *           iddocumento:
 *           type: string
 *           description: El ID del usuario.
 *           example: 123456789
 *   responses:
 *    200:
 *      description: Perfil obtenido exitosamente.
 *    401:
 *     description: No has iniciado sesión.
 *    403:
 *     description: No tienes permiso para ver este perfil.
 */
app.get("/perfil", (req, res) => {
  /*if (!usuarioActual) {
    return res.status(401).json({ message: "No has iniciado sesión." });
  }

  // Asegurarse de que el iddocumento del usuarioActual coincide con el parámetro de la ruta
  if (req.params.iddocumento !== usuarioActual.iddocumento) {
    return res.status(403).json({ message: "No tienes permiso para ver este perfil." });
  }*/

  return ValidarDatosPerfil1(res);
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

