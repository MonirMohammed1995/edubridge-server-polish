require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

/* ---------- Middleware ---------- */
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

/* ---------- LANGUAGE CATEGORIES ---------- */
const languageCategories = [
  { title: "English", path: "english", icon: "FaLanguage" },
  { title: "Spanish", path: "spanish", icon: "GiTalk" },
  { title: "French", path: "french", icon: "SiGoogletranslate" },
  { title: "Arabic", path: "arabic", icon: "GiEgyptianProfile" },
  { title: "Hindi", path: "hindi", icon: "GiIndiaGate" },
  { title: "Chinese", path: "chinese", icon: "TbLanguageHiragana" },
  { title: "German", path: "german", icon: "FaGlobe" },
  { title: "Japanese", path: "japanese", icon: "TbWorld" },
  { title: "Russian", path: "russian", icon: "MdOutlineLanguage" },
  { title: "Bengali", path: "bengali", icon: "MdTranslate" },
  { title: "Italian", path: "italian", icon: "FaLanguage" },
  { title: "Korean", path: "korean", icon: "TbLanguageHiragana" },
];

app.get('/categories', (_req, res) => res.send(languageCategories));

/* ---------- MongoDB Setup ---------- */
if (!process.env.DB_USER || !process.env.DB_PASS) {
  console.error("❌ Missing DB_USER/DB_PASS env vars");
  process.exit(1);
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@phlearner.tk4afnk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');

    const db = client.db('tutorsDB');
    const tutorCollection = db.collection('tutors');
    const bookingCollection = db.collection('bookings');
    const userCollection = db.collection('users');

    userCollection.createIndex({ email: 1 }, { unique: true }).catch(() => {});

    /* ---------- TUTOR ROUTES ---------- */
    app.post('/tutors', async (req, res) => {
      try {
        const { tutorName, language, price, description, image } = req.body;
        if (!tutorName || !language || price == null)
          return res.status(400).send({ success: false, error: 'Missing required fields' });

        const newTutor = {
          tutorName,
          language,
          price: Number(price),
          description: description || "",
          image: image || "",
          review: 0,
          createdAt: new Date(),
        };

        const result = await tutorCollection.insertOne(newTutor);
        res.status(201).send({ success: true, message: 'Tutor added', insertedId: result.insertedId });
      } catch (error) {
        console.error('Add tutor error:', error);
        res.status(500).send({ success: false, error: 'Failed to add tutor' });
      }
    });

    app.get('/tutors', async (_req, res) => {
      try {
        const tutors = await tutorCollection.find().toArray();
        res.send(tutors);
      } catch (error) {
        console.error('Fetch tutors error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch tutors' });
      }
    });

    app.get('/tutors/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const tutor = await tutorCollection.findOne({ _id: new ObjectId(id) });
        if (!tutor) return res.status(404).send({ success: false, error: 'Tutor not found' });
        res.send(tutor);
      } catch (error) {
        console.error('Fetch tutor error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch tutor' });
      }
    });

    // Update tutor
    app.patch('/tutors/:id', async (req, res) => {
      const { id } = req.params;
      const updateFields = req.body;

      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });

      try {
        const result = await tutorCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );

        if (result.matchedCount === 0)
          return res.status(404).send({ success: false, error: 'Tutor not found' });

        res.send({ success: true, message: 'Tutor updated successfully', modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Update tutor error:', error);
        res.status(500).send({ success: false, error: 'Failed to update tutor' });
      }
    });

    // Delete tutor
    app.delete('/tutors/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });

      try {
        const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
        res.send({ success: true, deletedCount: result.deletedCount });
      } catch (error) {
        console.error('Delete tutor error:', error);
        res.status(500).send({ success: false, error: 'Failed to delete tutor' });
      }
    });

    /* ---------- BOOKING ROUTES ---------- */
    app.post('/bookings', async (req, res) => {
      try {
        const { tutorId, userEmail, date } = req.body;
        if (!tutorId || !userEmail || !date)
          return res.status(400).send({ success: false, error: 'Missing required fields' });
        if (!ObjectId.isValid(tutorId)) return res.status(400).send({ success: false, error: 'Invalid tutorId' });

        const booking = {
          tutorId: new ObjectId(tutorId),
          userEmail,
          bookedAt: date,
          reviewed: false,
          createdAt: new Date(),
        };

        const result = await bookingCollection.insertOne(booking);
        res.status(201).send({ success: true, message: 'Booking successful', insertedId: result.insertedId });
      } catch (error) {
        console.error('Booking error:', error);
        res.status(500).send({ success: false, error: 'Failed to book tutor' });
      }
    });

    app.get('/bookings/:email', async (req, res) => {
      const { email } = req.params;
      try {
        const bookings = await bookingCollection.aggregate([
          { $match: { userEmail: email } },
          { $lookup: { from: "tutors", localField: "tutorId", foreignField: "_id", as: "tutor" } },
          { $unwind: "$tutor" },
          { $project: {
              _id: 1, tutorId: 1, userEmail: 1, bookedAt: 1, reviewed: 1,
              tutorName: "$tutor.tutorName", language: "$tutor.language", price: "$tutor.price", image: "$tutor.image"
            }
          },
        ]).toArray();

        res.send(bookings);
      } catch (error) {
        console.error('Fetch bookings error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch bookings' });
      }
    });

    app.patch('/bookings/reviewed/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const booking = await bookingCollection.findOne({ _id: new ObjectId(id) });
        if (!booking) return res.status(404).send({ success: false, message: 'Booking not found' });
        if (booking.reviewed) return res.status(400).send({ success: false, message: 'Already reviewed' });

        await bookingCollection.updateOne({ _id: new ObjectId(id) }, { $set: { reviewed: true } });
        await tutorCollection.updateOne({ _id: booking.tutorId }, { $inc: { review: 1 } });

        res.send({ success: true, message: 'Booking reviewed & tutor rating updated' });
      } catch (error) {
        console.error('Update booking review error:', error);
        res.status(500).send({ success: false, error: 'Failed to update review' });
      }
    });

    /* ---------- USER ROUTES ---------- */
    app.post('/users', async (req, res) => {
      try {
        const { name, email, role } = req.body;
        if (!name || !email) return res.status(400).send({ success: false, error: 'Name and email are required' });

        const existing = await userCollection.findOne({ email });
        if (existing) return res.status(409).send({ success: false, message: 'User already exists' });

        const result = await userCollection.insertOne({ name, email, role: (role || 'user').toLowerCase(), createdAt: new Date() });
        res.status(201).send({ success: true, message: 'User registered', insertedId: result.insertedId });
      } catch (error) {
        console.error('Add user error:', error);
        res.status(500).send({ success: false, error: 'Failed to add user' });
      }
    });

    app.get('/users', async (_req, res) => {
      try {
        const users = await userCollection.find().toArray();
        res.send(users);
      } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch users' });
      }
    });

    app.get('/users/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const user = await userCollection.findOne({ email });
        if (!user) return res.status(404).send({ success: false, error: 'User not found' });
        res.send(user);
      } catch (error) {
        console.error('Get user by email error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch user' });
      }
    });

    app.patch('/users/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body;
        if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
        if (!role) return res.status(400).send({ success: false, error: 'Role is required' });

        const result = await userCollection.updateOne({ _id: new ObjectId(id) }, { $set: { role: role.toLowerCase() } });
        res.send({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).send({ success: false, error: 'Failed to update role' });
      }
    });

    app.delete('/users/:id', async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });

        const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
        res.send({ success: true, deletedCount: result.deletedCount });
      } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).send({ success: false, error: 'Failed to delete user' });
      }
    });

    /* ---------- DASHBOARD STATS ---------- */
    app.get('/dashboard/stats', async (_req, res) => {
      try {
        const [totalTutors, totalBookings, totalUsers, pendingReviews] = await Promise.all([
          tutorCollection.countDocuments(),
          bookingCollection.countDocuments(),
          userCollection.countDocuments(),
          bookingCollection.countDocuments({ reviewed: false }),
        ]);
        res.send({ totalTutors, totalBookings, totalUsers, pendingReviews });
      } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch dashboard stats' });
      }
    });

    app.get('/health', async (_req, res) => {
      try { await db.command({ ping: 1 }); res.send({ ok: true }); } 
      catch { res.status(500).send({ ok: false }); }
    });

  } catch (err) {
    console.error('❌ MongoDB Connection Failed:', err);
    process.exit(1);
  }
}

run().catch(console.dir);

/* ---------- Root endpoint ---------- */
app.get('/', (_req, res) => {
  res.send('🌍 Online Tutor Booking API is running!');
});

/* ---------- Start server ---------- */
app.listen(port, () => {
  console.log(`🚀 Server is listening on port ${port}`);
});
