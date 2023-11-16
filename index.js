require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
app.use(cors());
app.use(express.json());

const verifyToken = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.SECKRET_KEY, (error, decoded) => {
    if (error) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.SECRET_PASSWORD}@cluster0.pdzlhd7.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("knowVibe").collection("users");
    const courseCollection = client.db("knowVibe").collection("courses");

    app.post("/jwt", (req, res) => {
      const email = req.query.email;
      const token = jwt.sign(
        {
          email: email,
        },
        process.env.SECKRET_KEY,
        { expiresIn: "20000h" }
      );
      res.send({ token });
    });

    app.get("/authorization", async (req, res) => {
      const email = req?.query?.email;
      const user = await usersCollection.findOne({ email: email });
      if (user) {
        res.send({ role: user?.role });
      }
    });

    app.put("/add-user", async (req, res) => {
      const userData = req.body;
      const email = req?.query?.email;
      const filter = {
        email: email,
      };

      const savedUser = await usersCollection.findOne(filter);
      const user = {
        $set: {
          name: userData?.name,
          email: userData?.email,
          photo_url: userData?.photo_url,
          role: savedUser?.role || "student",
        },
      };
      const options = { upsert: true };
      const result = await usersCollection.updateOne(filter, user, options);
      res.send(result);
    });

    app.get("/courses", async (req, res) => {
      const result = await courseCollection.find().toArray();
      res.send(result);
    });

    app.get("/courses/:id", async (req, res) => {
      const id = req.params.id;
      const result = await courseCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running well");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
