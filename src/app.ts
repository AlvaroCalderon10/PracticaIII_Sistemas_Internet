import { Db } from "mongodb";
import { connectDB } from "./mongo";
import express from "express";
import { book, free, freeSeats, status,signin, login,logout, mybookings} from "./resolvers";
var body_parser = require('body-parser');
const run = async () => {
  const db: Db = await connectDB();
  const app = express();
  app.set("db", db);

  app.use(express.json());
  app.use((req, res, next) => {
    next();
  });
  
  app.get("/status", status);
  app.post("/free", free);
  app.get("/freeSeats", freeSeats);
  app.post("/logout", logout);
  app.post("/book", book);
  app.post("/login", login);
  app.post("/signin",signin);
  app.get("/mybookins",mybookings);

  await app.listen(3000);
};

try {
  run();
} catch (e) {
  console.error(e);
}
