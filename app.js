const express = require("express");
const app = express(); // Create an Express.js application
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.use(cors());
app.use(express.json());
const port = 3000;

function createToken(user) {
  const token = jwt.sign(
    {
      email: user.email,
    },
    "eventify",
    { expiresIn: "7d" }
  );
  return token;
}
function verifyToken(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];
  const verify = jwt.verify(token, "eventify");
  if (!verify?.email) {
    return res.send("You are not authorized");
  }
  req.user = verify.email;
  next();
}

const uri =
  "mongodb+srv://hanifcse90:zfmnsYx8mWbS2Lst@cluster0.qhlqq0n.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
    const eventifyUserInfoDB = client.db("eventifyUserInfoDB");
    const eventifyUserInfoCollection = eventifyUserInfoDB.collection(
      "eventifyUserInfoCollection"
    );
    const eventsInfo = client.db("eventsInfo");
    const eventsInfoCollection = eventsInfo.collection("eventsInfoCollection");

    // Event Information

    app.post("/events", verifyToken, async (req, res) => {
      const event = req.body;
      const result = await eventsInfoCollection.insertOne(event);
      res.send(result);
    });

    app.get("/events", async (req, res) => {
      const events = eventsInfoCollection.find();
      const result = await events.toArray();
      res.send(result);
    });

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsInfoCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.patch("/events/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const result = await eventsInfoCollection.updateOne(filter, {
        $set: updateData,
      });
      res.send(result);
    });
    app.delete("/events/:id", verifyToken, async (req, res) => {
      const id = req.params;
      const result = await eventsInfoCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Search events by title, description, or category
    // Search route
    app.get("/search", async (req, res) => {
      const query = req.query.q;

      if (!query) {
        return res.status(400).send("Search query missing");
      }

      try {
        const results = await eventsInfoCollection
          .find({
            $or: [
              { title: new RegExp(query, "i") },
              { description: new RegExp(query, "i") },
              { location: new RegExp(query, "i") },
            ],
          })
          .toArray();

        res.json(results);
      } catch (error) {
        res.status(500).send("Server error");
      }
    });

    // User Information
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user?.email;
      const token = createToken(user);

      const isUserExists = await eventifyUserInfoCollection.findOne({ email });
      if (isUserExists) {
        res.send({
          status: "success",
          message: "Login Successful",
          token,
        });
      } else {
        await eventifyUserInfoCollection.insertOne(user);
        res.send({ token });
      }
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const result = await eventifyUserInfoCollection.findOne({ email });
      res.send(result);
    });

    app.patch("/users/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const updateData = req.body;
      console.log(updateData);
      const filter = { email };
      const result = await eventifyUserInfoCollection.updateOne(filter, {
        $set: updateData,
      });
      res.send(result);
    });

    console.log("You successfully connected to MongoDB!");
  } finally {
    // // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Express.js server!");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
