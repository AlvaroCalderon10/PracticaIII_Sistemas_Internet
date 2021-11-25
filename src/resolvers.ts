import { Request, Response } from "express";
import { Db } from "mongodb";
import { exit, nextTick } from "process";
import { v4 as uuid } from "uuid";

const checkDateValidity = (
  day: string,
  month: string,
  year: string
): boolean => {
  const date = new Date(`${month} ${day}, ${year}`);
  return date.toString() !== "Invalid Date";
};

export const status = async (req: Request, res: Response) => {
  const date = new Date();
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  res.status(200).send(`${day}-${month}-${year}`);
};


export const signin = async (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;
  const db: Db = req.app.get("db");
  const collection = db.collection("Usuarios");

  if (!req.body) {
    return res.status(500).send("No Body");
  }

  const exist = await collection.findOne({ email: email, password: password });
  if (exist != null) {
    res.status(409).send("Este usuario ya existe");
  } else {
    const chars = await collection
      .insertOne({
        "email": email,
        "password": password,
        "token": undefined
      });

    res.status(200).send("Has sido registrado");
  }
};
export const login = async (req: Request, res: Response) => {
  const email = req.body.email;
  const password = req.body.password;
  const token_key: string = uuid();
  if (!req.body) {
    return res.status(500).send("No Body");
  }

  const db: Db = req.app.get("db");
  const collection = db.collection("Usuarios");
  const exist = await collection.findOne({ email: email, password: password });
  if (exist != null) {
    const filter = { email: email, password: password };
    const updateDoc = {
      $set: {
        token: token_key
      }
    };
    const result = await collection.updateOne(filter, updateDoc);

    res.status(200).json({
      mensaje: 'Autenticación correcta',
      token: token_key
    });
  } else {
    res.status(401).send("NO se ha podido realizar el login");
  }
};
export const logout = async (req: Request, res: Response) => {
  const token = req.headers.token;
  if (!req.headers.token) {
    return res.status(500).send("No token");
  }

  const db: Db = req.app.get("db");
  const collection = db.collection("Usuarios");
  const exist = await collection.findOne({ token: token });
  if (exist != null) {
    const filter = { token: token };
    const updateDoc = {
      $set: {
        token: undefined
      }
    };
    const result = await collection.updateOne(filter, updateDoc);
    res.status(200).send("Has cerrado sesion");

  } else {
    res.status(500).send("Error, no se ha podido hacer logout");
  }
};
export const free = async (req: Request, res: Response) => {
  const db: Db = req.app.get("db");
  const collection = db.collection("Reservas");
  const collection1 = db.collection("Usuarios");
  if (!req.body) {
    return res.status(500).send("No params");
  }
  if (!req.headers.token) {
    return res.status(500).send("No token");
  }
  const token_key = req.headers.token;
  const token_reserva=req.headers.reserva
  console.log(token_reserva);
  const exist = await collection1.findOne({ token: token_key });
  if (exist != null) {
    const { day, month, year } = req.body as {
      day: string;
      month: string;
      year: string;
    };
    if (!day || !month || !year || !token_reserva) {
      return res
        .status(500)
        .send("Missing day, month or year or seat number or token");
    }

    if (!checkDateValidity(day, month, year)) {
      return res.status(500).send("Invalid day, month or year");
    }

    const booked = await collection.findOne({ day, month, year, token_reserva });
    if (booked) {
      await collection.deleteOne({ day, month, year, token_reserva });
      return res.status(200).send("Seat is now free");
    }

    return res.status(500).send("Seat is not booked");
  } else {
    return res.status(500).send("Usuario no logeado");
  }
};
export const freeSeats = async (req: Request, res: Response) => {
  const db: Db = req.app.get("db");
  const collection = db.collection("Reservas");
  const collection1 = db.collection("Usuarios");
  const token = req.headers.token;

  if (!req.query) {
    return res.status(500).send("No params");
  }
  if (!req.headers.token) {
    return res.status(500).send("No token");
  }
  const exist = await collection1.findOne({ token: token });
  if (exist != null) {
    const { day, month, year } = req.query as {
      day: string;
      month: string;
      year: string;
    };

    if (!day || !month || !year) {
      return res.status(500).send("Missing day, month or year");
    }

    if (!checkDateValidity(day, month, year)) {
      return res.status(500).send("Invalid day, month or year");
    }

    const seats = await collection.find({ day, month, year }).toArray();

    const freeSeats = [];
    for (let i = 1; i <= 20; i++) {
      if (!seats.find((seat) => parseInt(seat.number) === i)) {
        freeSeats.push(i);
      }
    }
    return res.status(200).json({ free: freeSeats });
  } else {
    res.status(500).send("Error, el token es incorrecto o no estás logeado");
  }
};
export const book = async (req: Request, res: Response) => {
  const db: Db = req.app.get("db");
  const collection = db.collection("Reservas");
  const collection1 = db.collection("Usuarios");
  if (!req.query) {
    return res.status(500).send("No params");
  }
  if (!req.headers.token) {
    return res.status(500).send("No token");
  }
  const token_key = req.headers.token;
  const exist = await collection1.findOne({ token: token_key });
  if (exist != null) {
    const usuario=exist.email as string;
    const { day, month, year, seat } = req.query as {
      day: string;
      month: string;
      year: string;
      seat: string;
    };

    if (!day || !month || !year || !seat) {
      return res.status(500).send("Missing day, month or year or seat number");
    }

    if (!checkDateValidity(day, month, year)) {
      return res.status(500).send("Invalid day, month or year");
    }

    const notFree = await collection.findOne({ day, month, year, seat });
    if (notFree) {
      return res.status(404).send("Seat is not free");
    }

    const token_reserva = uuid();
    await collection.insertOne({ usuario,day, month, year, seat, token_reserva });

    return res.status(200).json({
      fecha: `${day}-${month}-${year}`,
      Asiento: seat,
      token_Reserva: token_reserva
    });
  } else {
    return res.status(500).send("Usuario no logeado");

  }
};

export const mybookings = async (req: Request, res: Response) => {
  const db: Db = req.app.get("db");
  const collection = db.collection("Reservas");
  const collection1 = db.collection("Usuarios");

  if (!req.headers.token) {
    return res.status(500).send("No token");
  }

  const token = req.headers.token;
  const exist = await collection1.findOne({ token:token });
  if (exist != null) {
    const date_hoy = new Date();
    const usuario=exist.email;
    const reservas=await collection.find({usuario}).toArray();
    const reservas_futuras=reservas.filter((elem)=>{
      const{usuario,day,month,year,seat,token_reserva}=elem;
      const fecha=new Date();
      fecha.setDate(day);
      fecha.setMonth(month-1);
      fecha.setFullYear(year);
      if(fecha>=date_hoy){
        return{day,month,year,seat,token_reserva};
      }
    });
    if(reservas_futuras!=null){
      res.status(200).json(reservas_futuras);
    }else{
      res.status(404).send("No hay Reservas Futuras");
    }

  }else{
    res.status(500).send("Error el token es incorrecto o no estas logeado");
  }
};
