const express = require('express')
const cors = require("cors");
require("dotenv").config();
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;


const app = express()
const port = process.env.PORT || 5000;


const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y5fcu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// verifyToken of the user
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}



async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('clothzilla').collection('services');
        const orderCollection = client.db('clothzilla').collection('orders');
        const usersCollection = client.db('clothzilla').collection('users');
        const reviewCollection = client.db('clothzilla').collection('reviews');


        // GET SERVICE API
        app.get('/services', async (req, res) => {
            const result = await serviceCollection.find({}).toArray();
            res.send(result);
        })


        // GET SINGLE SERVICE API
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await serviceCollection.findOne(query)
            res.send(result);
        })



        // GET ORDERS API
        app.get('/orders', async (req, res) => {
            const result = await orderCollection.find({}).toArray();
            console.log(result);
            res.send(result);
        })




        // MY ORDER API
        app.get("/myorders/:email", async (req, res) => {
            const result = await orderCollection.find({
                email: req.params.email,
            }).toArray();
            res.send(result);
        });


        // GET REVIEW API
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.send(result);
        })


        // ORDER SERVICE API
        app.post('/order', async (req, res) => {
            console.log(req.body);
            const result = await orderCollection.insertOne(req.body);
            res.send(result);
        })


        // ADD SERVICE API
        app.post('/addService', async (req, res) => {
            console.log(req.body);
            const result = await serviceCollection.insertOne(req.body);
            res.send(result);
        })



        // ADD REVIEW API
        app.post('/addReview', async (req, res) => {
            console.log(req.body);
            const result = await reviewCollection.insertOne(req.body);
            res.send(result);
        })






        // UPDATE STATUS API
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const updatedUser = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: updatedUser.status
                },
            }
            const result = await orderCollection.updateOne(filter, updateDoc, options);
            console.log('updating user', id);
            res.send(result)

        })



        // DELETE ORDERS API
        app.delete("/deleteOrders/:id", async (req, res) => {
            console.log(req.params.id);
            const result = await orderCollection.deleteOne({
                _id: ObjectId(req.params.id),
            });
            res.send(result);
        });



        // DELETE SERVICES API
        app.delete("/deleteServices/:id", async (req, res) => {
            console.log(req.params.id);
            const result = await serviceCollection.deleteOne({
                _id: ObjectId(req.params.id),
            });
            res.send(result);
        });


        // Checking Admin Match
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })


        // User Insert API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });


        // User Update API
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // Making Admin And set role admin to a users
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'You Cannot Make Admin Sorry!!!' })
            }

        })





    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})