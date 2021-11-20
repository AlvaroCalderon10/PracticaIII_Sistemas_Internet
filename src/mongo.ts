import { Db, MongoClient } from "mongodb";

export const connectDB = async (): Promise<Db> => {
  const dbName: string = "Coworking";
  const mongouri: string = "mongodb+srv://AlvaroCalderon:Zxcvbnm11@cluster0.yr5xx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

  const client = new MongoClient(mongouri);

  try {
    await client.connect();
    console.info("MongoDB connected");

    return client.db(dbName);
  } catch (e) {
    throw e;
  }
};
