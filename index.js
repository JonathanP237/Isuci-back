// server/index.js
import pg from 'pg';
import {config} from 'dotenv';
import express from 'express';

config();

const PORT = process.env.PORT || 3001;

const app = express();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,  
})

app.get("/api", (req, res) => {
    res.json({ message: "Hello from server!" });
});

app.get("/ping", async(req, res) => {
  const result = await pool.query('SELECT NOW()');
  return res.json(result.rows[0]);
});

app.get("/test", async(req, res) => {
  const result = await pool.query("SELECT * FROM usuario WHERE idtipousuario = 4 AND generousuario = 'M'");
  return res.json(result.rows);
});

app.post("/login", (req, res) => {
  if(err){
    return res.json({ message: "Error al realizar el loggueo. Intente de nuevo." });
  }
});

app.post("/registro", (req, res) => {
  if(err){
    return res.json({ message: "Error al realizar el registro. Intente de nuevo." });
  }
  res.json({ message: "Registro exitoso." });
});

app.get("/perfil", (req, res) => {
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});

