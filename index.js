const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middle were
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://medicamp-603c8.web.app",
      "https://medicamp-603c8.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w9fev91.mongodb.net/?retryWrites=true&w=majority`;

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const campCollection = client.db("mediCampDB").collection("camps");
    const usersCollection = client.db("mediCampDB").collection("users");
    const registeredCampCollection = client.db("mediCampDB").collection("registeredCamp");
    const registerUpcomingCampCollection = client.db("mediCampDB").collection("registeredUpcomingCamp");
    const paymentHistoryCollection = client.db("mediCampDB").collection("payments");
    const upcomingCampCollection = client.db("mediCampDB").collection("upcoming-camps");


    // user related api
    app.post('/users', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })
     
    // check user role
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await usersCollection.findOne(query);
      res.send(result)
    })




    // camp related api
    app.post('/add-a-camp', async (req, res) => {
      const camp = req.body
      const result = await campCollection.insertOne(camp);
      res.send(result)
    })

    app.get('/all-camps', async (req, res) => {
      const result = await campCollection.find().toArray();
      res.send(result)
    })
    app.get('/all-camps/:email', async (req, res) => {
      const email = req.params.email;
      const query = {organizerEmail: email}
      const result = await campCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/camp/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.findOne(query)
      res.send(result)
    })

    app.delete('/camp/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await campCollection.deleteOne(query)
      res.send(result)
    })
  

    app.put('/camp/:id', async (req, res) => {
      const id = req.params.id
      const camp = req.body
      console.log(id, camp)
      const query = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          campName: camp.campName,
          campFees: camp.campFees,
          location: camp.location,
          specializedService: camp.specializedService,
          healthProfessional: camp.healthProfessional,
          audience: camp.audience,
          image: camp.image,
          scheduleDate: camp.scheduleDate,
          description: camp.description,
        }
      }
      const result = await campCollection.updateOne(query, updatedDoc, options)
      res.send(result)
    })






    // Registered camp related api
    app.post('/registered-camp', async (req, res) => {
      const camp = req.body
      const result = await registeredCampCollection.insertOne(camp);
      // console.log(result)
      res.send(result)
    })

    // for testimonials
    app.get('/registered-camp-testimonials', async (req, res) => {
      const result = await registeredCampCollection.find().toArray()
      res.send(result)
    })
    // for participant
    app.get('/registered-camp/:email', async (req, res) => {
      const email = req.params?.email;
      const query = { 'participant.email': email }
      const result = await registeredCampCollection.find(query).toArray()
      res.send(result)
    })
    // for organizer
    app.get('/registered-camp-organizer/:email', async (req, res) => {
      const email = req.params?.email;
      const query = { organizerEmail: email };
      const result = await registeredCampCollection.find(query).toArray()
      res.send(result)
    })
  
    app.get('/payment-camp/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await registeredCampCollection.findOne(query)
      res.send(result)
    })

     //review related API | give review for paid camp
     app.patch('/review-update/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body
      console.log(id, status)
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          paymentStatus: status.paymentStatus,
          rating:status.rating,
          reviewDetails:status.reviewDetails,
          reviewerName:status.reviewerName,
          reviewerImg:status.reviewerImg,
          reviewTime: status.reviewTime,
        }
      }
      console.log(updatedDoc)
      const result = await registeredCampCollection.updateOne(query, updatedDoc)
      res.send(result)
    })


    // for participant
    app.delete('/registered-camp/:id', async (req, res) => {
      const id = req.params.id;
      console.log( 'delete', id)
      const query = { _id: new ObjectId(id) }
      const result = await registeredCampCollection.deleteOne(query)
      res.send(result)
    })

    // for organizer
    app.delete('/registered-camp-organizer/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await registeredCampCollection.deleteOne(query)
      res.send(result)
    })
  

    //payment related API | update payment status for registered camp
    app.patch('/payment/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          paymentStatus: status.paymentStatus,
          confirmationStatus: status.confirmationStatus,
        }
      }
      console.log(updatedDoc)
      const result = await registeredCampCollection.updateOne(query, updatedDoc)
      res.send(result)
    })
    
    // payment intent
    app.get('/payment-history/:email', async (req, res) => {
      const query = { email: req.params.email }
      // if (req.params.email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }
      // console.log(query)
      const result = await  paymentHistoryCollection.find(query).toArray();
      res.send(result)
    })

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100);
      // console.log(amount, ' amount')
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      // console.log(payment)
      const paymentResult = await  paymentHistoryCollection.insertOne(payment)
      // carefully delete ease item from the cart
      // const query = {
      //   _id: {
      //     $in: payment.cartIds.map(id => new ObjectId(id))
      //   }
      // }
      // const deleteResult = await registeredCampCollection.deleteMany(query)
      res.send({ paymentResult})
    })



    // add upcoming camp related api

    app.post('/upcoming-camp', async (req, res) => {
      const camp = req.body
      // console.log(camp)
      const result = await upcomingCampCollection.insertOne(camp);
      res.send(result)
    })

     // register upcoming camp related api
    app.post('/registered-upcoming-camp', async (req, res) => {
      const camp = req.body
      console.log(camp)
      const result = await registerUpcomingCampCollection.insertOne(camp);
      res.send(result)
    })
   
    app.get('/upcoming-camp', async (req, res) => {
      const result = await upcomingCampCollection.find().toArray();
      res.send(result)
    })
    // for upcoming camp details
    app.get('/upcoming-camp/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await upcomingCampCollection.findOne(query);
      res.send(result)
    })
   







  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("medical camp is open");
});

app.listen(port, () => {
  console.log(`Medical camp is open on port ${port}`);
});







