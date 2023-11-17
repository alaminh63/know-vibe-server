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
    const instructorsCollection = client.db("knowVibe").collection("instructors");

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
    
    app.patch("/enrollCourses/:email", async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      if (user.enrolledCourses && user.enrolledCourses.includes(data._id)) {
        res.status(400).json({ message: "Already enrolled in the tournament" });
        return;
      }
      const updateUserInfo = {
        $push: {
          enrolledCourses: data._id,
        },
      };
      const result = await usersCollection.updateOne(query, updateUserInfo);
      res.send(result);
    });
    
    app.get("/enrolledCourses/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }
        res.json({ enrolledCourses: user.enrolledCourses });
      } catch (error) {
        console.error("Error fetching Get Bookmark games:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    app.patch("/bookmarkedCourse/:email", async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      if (user.bookmarkedCourse && user.bookmarkedCourse.includes(data._id)) {
        res.status(400).json({ message: "Already enrolled in the tournament" });
        return;
      }
      const updateUserInfo = {
        $push: {
          bookmarkedCourse: data._id,
        },
      };
      const result = await usersCollection.updateOne(query, updateUserInfo);
      res.send(result);
    });
    
    app.get("/bookmarkedCourse/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        if (!user) {
          res.status(404).json({ message: "User not found" });
          return;
        }
        res.json({ bookmarkedCourse: user.bookmarkedCourse });
      } catch (error) {
        console.error("Error fetching Get Bookmark games:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });
    app.get("/instructors", async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });
    
    app.get("/instructors/:id", async (req, res) => {
      const id = req.params.id;
      const result = await instructorsCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/add-class", async (req, res) => {
      const data = req.body;
      const newClass = {
        class_name: data.class_name,
        class_image: data.class_image,
        instructor_name: data.instructor_name,
        instructor_email: data.instructor_email,
        avilable_seats: parseFloat(data.avilable_seats),
        price: parseFloat(data.price),
        status: "pending",
        student_enroll: 0,
        feedback: "",
      };

      const instructor = await instructorsCollection.findOne({
        email: data.instructor_email,
      });

      if (!instructor) {
        await instructorsCollection.insertOne({
          name: data.instructor_name,
          image: data.instructor_photo,
          email: data.instructor_email,
        });
      }

      const result = await courseCollection.insertOne(newClass);
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
