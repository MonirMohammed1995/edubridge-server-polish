require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI and client setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@phlearner.tk4afnk.mongodb.net/?retryWrites=true&w=majority&appName=PHLearner`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');

    const db = client.db('tutorsDB');
    const tutorCollection = db.collection('tutors');
    const bookingCollection = db.collection('bookings');

    // ---------- TUTOR ROUTES ----------

    // Add tutor
    app.post('/tutors', async (req, res) => {
      const tutorData = { ...req.body, review: 0 };
      try {
        const result = await tutorCollection.insertOne(tutorData);
        res.status(201).send({ success: true, message: 'Tutor added', insertedId: result.insertedId });
      } catch (error) {
        console.error('Add tutor error:', error);
        res.status(500).send({ success: false, error: 'Failed to add tutor' });
      }
    });

    // Get all tutors
    app.get('/tutors', async (req, res) => {
      try {
        const tutors = await tutorCollection.find().toArray();
        res.send(tutors);
      } catch (error) {
        console.error('Fetch tutors error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch tutors' });
      }
    });

    // Get single tutor by ID
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
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const result = await tutorCollection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
        if (result.matchedCount === 0) return res.status(404).send({ success: false, message: 'Tutor not found' });
        if (result.modifiedCount === 0) return res.status(200).send({ success: true, message: 'No changes made' });
        res.send({ success: true, message: 'Tutor updated' });
      } catch (error) {
        console.error('Update tutor error:', error);
        res.status(500).send({ success: false, error: 'Update failed' });
      }
    });

    // Delete tutor
    app.delete('/tutors/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const result = await tutorCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ success: false, message: 'Tutor not found' });
        res.send({ success: true, message: 'Tutor deleted' });
      } catch (error) {
        console.error('Delete tutor error:', error);
        res.status(500).send({ success: false, error: 'Failed to delete tutor' });
      }
    });

    // Increment review count
    app.patch('/tutors/review/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const result = await tutorCollection.updateOne({ _id: new ObjectId(id) }, { $inc: { review: 1 } });
        if (result.matchedCount === 0) return res.status(404).send({ success: false, message: 'Tutor not found' });
        res.send({ success: true, message: 'Review count updated' });
      } catch (error) {
        console.error('Review increment error:', error);
        res.status(500).send({ success: false, error: 'Failed to update review' });
      }
    });

    // ---------- BOOKING ROUTES ----------

    // Create booking
    app.post('/bookings', async (req, res) => {
      const booking = { ...req.body, reviewed: false };
      try {
        const result = await bookingCollection.insertOne(booking);
        res.status(201).send({ success: true, message: 'Booking successful', insertedId: result.insertedId });
      } catch (error) {
        console.error('Booking error:', error);
        res.status(500).send({ success: false, error: 'Failed to book tutor' });
      }
    });

    // Get bookings by user email
    app.get('/bookings/:email', async (req, res) => {
      const { email } = req.params;
      try {
        const bookings = await bookingCollection.find({ email }).toArray();
        res.send(bookings);
      } catch (error) {
        console.error('Fetch bookings error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch bookings' });
      }
    });

    // Mark booking as reviewed
    app.patch('/bookings/reviewed/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const result = await bookingCollection.updateOne({ _id: new ObjectId(id) }, { $set: { reviewed: true } });
        if (result.matchedCount === 0) return res.status(404).send({ success: false, message: 'Booking not found' });
        res.send({ success: true, message: 'Booking marked as reviewed' });
      } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).send({ success: false, error: 'Failed to update booking review status' });
      }
    });

    // Update booking
    app.patch('/bookings/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const result = await bookingCollection.updateOne({ _id: new ObjectId(id) }, { $set: req.body });
        if (result.matchedCount === 0) return res.status(404).send({ success: false, message: 'Booking not found' });
        res.send({ success: true, message: 'Booking updated' });
      } catch (error) {
        console.error('Update booking error:', error);
        res.status(500).send({ success: false, error: 'Failed to update booking' });
      }
    });

    // Delete booking
    app.delete('/bookings/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).send({ success: false, error: 'Invalid ID format' });
      try {
        const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ success: false, message: 'Booking not found' });
        res.send({ success: true, message: 'Booking deleted' });
      } catch (error) {
        console.error('Delete booking error:', error);
        res.status(500).send({ success: false, error: 'Failed to delete booking' });
      }
    });

    // ---------- LANGUAGE CATEGORIES ----------

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

    app.get('/categories', (req, res) => res.send(languageCategories));

    // ---------- DASHBOARD STATS ----------

    app.get('/dashboard/stats', async (req, res) => {
      try {
        const totalTutors = await tutorCollection.countDocuments();
        const totalBookings = await bookingCollection.countDocuments();
        const pendingReviews = await bookingCollection.countDocuments({ reviewed: false });

        res.send({ totalTutors, totalBookings, pendingReviews });
      } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).send({ success: false, error: 'Failed to fetch dashboard stats' });
      }
    });

  } catch (err) {
    console.error("MongoDB Connection Failed:", err);
    process.exit(1);
  }
}

run().catch(console.dir);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Online Tutor Booking API is running!');
});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
