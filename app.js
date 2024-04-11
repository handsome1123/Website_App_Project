const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyparser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const Swal = require('sweetalert2');


const app = express();

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Define storage for the uploaded image
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/img/'); //Uploads will be stored in the 'public/img' directory
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Appendig timestamp to avoid filename conflicts
  }
});

const upload = multer({storage: storage});

// Session Setup
app.use(session({
  secret: 'secret_key',
  resave: true,
  saveUninitialized: true
}));

// set the view engine to ejs
app.set('view engine', 'ejs');

// Body-parser middleware
app.use(bodyparser.urlencoded({ extended: true }));
app.set(bodyparser.json())

// connection to mysql database
const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'web-app2'
});

// check database connection 
con.connect(function (err) {
  if (err) {
    console.error("Error connecting to the dabase", err);
    return;
  } else {
    console.log('Connected to the database');
  }
});

// render signin page
app.get('/', (req, res) => {
  res.render('signin');
});

//render signup page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle POST request for user signup
app.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  try {
    // Check if email already exists
    con.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
      if (error) {
        console.error('Error checking existing email:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (results.length > 0) {
        // Email already exists
        return res.status(400).json({ message: 'Email already exists' });
      }

      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into the database
        con.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, hashedPassword, email], (error, results) => {
          if (error) {
            console.error('Error creating new user:', error);
            return res.status(500).json({ message: 'Internal server error' });
          }

          // User registered successfully, redirect to login page
          // return res.status(200).json({ message: 'User registered successfully. Redirect to login page.' });
          return res.redirect('/');
        });
      } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Handle POST request for user signin
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  con.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
    if (error) {
      console.error('Error finding user:', error);
      return res.status(500).send('Internal server error');
    }

    if (results.length === 0) {
      // User not found
      // return res.status(400).json({ message: 'User not found' });
      return res.status(404).send('User not found');
    }

    // Compare password
    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Password incorrect
      return res.status(400).send('Incorrect Password');
      
    }

    // Set user session
    req.session.userId = user.user_id;

    // Redirect to respective dashboard based on user role
    switch (user.role) {
      case 'admin':
        return res.redirect('/staff/dashboard');
      case 'lecturer':
        return res.redirect('/lecturer/dashboard');
      case 'user':
        return res.redirect('/index');
      default:
        return res.status(400).send('Unknow User Role!');
    }
  });
});

// Render user dashboard
app.get('/index', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query to fetch rooms
    const roomsQuery = 'SELECT *, CONCAT("/img/", image_path) AS image_path FROM rooms';
    con.query(roomsQuery, (error, rooms) => {
      if (error) {
        console.error('Error retrieving rooms:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Query to fetch time slots for each room
      const slotsQuery = 'SELECT * FROM time_slots';
      con.query(slotsQuery, (error, time_slots) => {
        if (error) {
          console.error('Error retrieving time slots:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Organize time slots by room
        rooms.forEach(room => {
          room.timeSlots = time_slots.filter(slot => slot.room_id === room.room_id);
        });

        // Render the user dashboard page with user information and rooms
        res.render('user/index', { user, userId, rooms });
      });
    });
  });
});

// Render user booking form
app.get('/booking', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).send('Internal server error!');
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).send('User not found!');
    }

    // User found, extract user information
    const user = results[0];

    // Retrieve roomId and slotId from query parameters
    const { roomId, slotId } = req.query;

    // Assuming you fetch the room name, room picture path, start time, and end time based on roomId and slotId from your database
    const roomQuery = 'SELECT room_name, image_path FROM rooms WHERE room_id = ?';
    con.query(roomQuery, [roomId], (error, room) => {
      if (error) {
        console.error('Error fetching room details:', error);
        return res.status(500).send('Internal Server Error');
      }

      // Check if room array is empty or not
      if (!room || room.length === 0) {
        console.error('Room not found or empty');
        return res.status(404).send('Room not found');
      }

      // Assuming you fetch the start time and end time based on slotId
      const slotQuery = 'SELECT start_time, end_time FROM time_slots WHERE slot_id = ?';
      con.query(slotQuery, [slotId], (error, slot) => {
        if (error) {
          console.error('Error fetching time slot:', error);
          return res.status(500).send('Internal Server Error');
        }

        // Check if slot array is empty or not
        if (!slot || slot.length === 0) {
          console.error('Slot not found or empty');
          return res.status(404).send('Slot not found');
        }

        // Render the booking form with the provided data
        res.render('user/user_booking', {
          roomId: roomId,
          roomName: room[0].room_name,
          roomImage: room[0].image_path,
          startTime: slot[0].start_time,
          endTime: slot[0].end_time,
          slotId: slotId,
          userId: userId,
          user:user
        });
      });
    });
  });
});

// Route for booking a time slot
app.post('/booking', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;

  // Retrieve data from the request body
  const { roomId, slotId, objective } = req.body;

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get current hour and minutes
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();

  // Combine current time to get current time in HH:MM format
  const currentTime = currentHour + ':' + currentMinute;

  // Retrieve time slots from the database
  con.query('SELECT * FROM time_slots WHERE slot_id = ? AND start_time > ? ORDER BY start_time ASC', [slotId, currentTime], (error, results) => {
    if (error) {
      console.error('Error retrieving time slots:', error);
      return res.status(500).send('Internal server error');
    }

    // If there are no available time slots for today, return an error
    if (results.length === 0) {
      return res.status(400).send('No available time slots for today');
    }

    // Check if the student has already booked a slot for today
    con.query('SELECT * FROM bookings WHERE user_id = ? AND DATE = ?', [userId, today], (error, results) => {
      if (error) {
        console.error('Error checking existing bookings:', error);
        return res.status(500).send('Internal server error');
      }

      // If the student has already booked a slot for today, return an error
      if (results.length > 0) {
        return res.status(400).send('Student can only book a single slot per day');
      }

      // Insert booking record into the database
      con.query('INSERT INTO bookings (user_id, room_id, slot_id, objective, status, action_by) VALUES (?, ?, ?, ?, ?, ?)', [userId, roomId, slotId, objective, 'pending', userId], (error, results) => {
        if (error) {
          console.error('Error creating booking:', error);
          return res.status(500).send('Internal server error');

        }

        // Update the status of the room's time slots to "pending"
        con.query('UPDATE time_slots SET status = ? WHERE slot_id = ?', ['pending', slotId], (error, results) => {
          if (error) {
            console.error('Error updating time slot status:', error);
            return res.status(500).send('Internal server error');
          }

          // return res.status(200).json({ message: 'Booking successful' });
              // Display success message using SweetAlert2
            Swal.fire({
              icon: 'success',
              title: 'Booking Successful!',
              text: 'Your booking has been successfully processed.',
              confirmButtonColor: '#3085d6',
              confirmButtonText: 'OK'
            });

            // Redirect to a different page after displaying the success message
            res.redirect('/index');
        });
      });
    });
  });
});

// Render user booking request page
app.get('/user/checking-requests', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query database to get all pending booking request
    const query = "SELECT bookings.*, rooms.room_name, time_slots.start_time, time_slots.end_time, rooms.image_path " +
      "FROM bookings " +
      "JOIN rooms ON bookings.room_id = rooms.room_id " +
      "JOIN time_slots ON bookings.slot_id = time_slots.slot_id " +
      "WHERE bookings.status = 'pending'";

    con.query(query, (error, bookings) => {
      if (error) {
        // Handle error
        console.error('Error fecting bookings:', error);
        return res.status(500).send('Internal Server Error');
      }
      // Render the lecturer dashboard with bookings data
      res.render('user/checking_request', { user, bookings: bookings })

    });
  });
});

// Render user history
app.get('/user/history', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

     // Query to fetch booking history for the lecturer
  const query = `
  SELECT bookings.*, rooms.room_name, time_slots.start_time, time_slots.end_time, users.username
  FROM bookings 
  JOIN rooms ON bookings.room_id = rooms.room_id 
  JOIN time_slots ON bookings.slot_id = time_slots.slot_id 
  JOIN users ON bookings.user_id = users.user_id
  WHERE bookings.user_id = ?`;

con.query(query, [userId], (error, userHistory) => {
  if (error) {
    // Handle error
    console.error('Error fetching booking history:', error);
    return res.status(500).send('Internal Server Error');
  }

  // Render the lecturer's booking history page with fetched data
    res.render('user/user_history', {userHistory, user});
  });
  });
});

// Render lecturer dashboard
app.get('/lecturer/dashboard', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query database to get counts for different slot and room statuses
    const query = `
    SELECT 
            (SELECT COUNT(*) FROM time_slots) AS totalSlots,
            (SELECT COUNT(*) FROM time_slots WHERE status = 'free') AS freeSlots,
            (SELECT COUNT(*) FROM time_slots WHERE status = 'pending') AS pendingSlots,
            (SELECT COUNT(*) FROM time_slots WHERE status = 'reserved') AS reservedSlots,
            (SELECT COUNT(*) FROM time_slots WHERE status = 'disabled') AS disabledSlots
    `;
    con.query(query, (error, results) => {
      if (error) {
        console.error('Error fetching counts:', error);
        return res.status(500).send('Internal Server Error');
      }

      const { totalSlots, freeSlots, pendingSlots, reservedSlots, disabledSlots } = results[0];

      // Render the staff dashboard with counts
      res.render('lecturer/lecturer_dashboard', { user, totalSlots, freeSlots, pendingSlots, reservedSlots, disabledSlots });
    });
  });
});

// Render room lists for lecturer
app.get('/lecturer/room-lists', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query to fetch rooms
    const roomsQuery = 'SELECT *, CONCAT("/img/", image_path) AS image_path FROM rooms';
    con.query(roomsQuery, (error, rooms) => {
      if (error) {
        console.error('Error retrieving rooms:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Query to fetch time slots for each room
      const slotsQuery = 'SELECT * FROM time_slots';
      con.query(slotsQuery, (error, time_slots) => {
        if (error) {
          console.error('Error retrieving time slots:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Organize time slots by room
        rooms.forEach(room => {
          room.timeSlots = time_slots.filter(slot => slot.room_id === room.room_id);
        });

        // Render the user dashboard page with user information and rooms
        res.render('lecturer/lecturer_roomlist', { user, userId, rooms });
      });
    });
  });
});

// Render user booking request page
app.get('/lecturer/booking-requests', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query database to get all pending booking request
    const query = "SELECT bookings.*, rooms.room_name, time_slots.start_time, time_slots.end_time, rooms.image_path " +
      "FROM bookings " +
      "JOIN rooms ON bookings.room_id = rooms.room_id " +
      "JOIN time_slots ON bookings.slot_id = time_slots.slot_id " +
      "WHERE bookings.status = 'pending'";

    con.query(query, (error, bookings) => {
      if (error) {
        // Handle error
        console.error('Error fecting bookings:', error);
        return res.status(500).send('Internal Server Error');
      }
      // Render the lecturer dashboard with bookings data
      res.render('lecturer/booking_request', { user, bookings: bookings })

    });
  });
});

// Endpoint to handle booking approval
app.post('/lecturer/approve-booking', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
      // If the user is not logged in, redirect them to the login page
      return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  const { bookingId } = req.body;

  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
      if (error) {
          console.error('Error retrieving user information:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }

      // If the user is not found, send a 404 response
      if (results.length === 0) {
          return res.status(404).json({ message: 'User not found' });
      }

      // User found, extract user information
      const user = results[0];

      // Update booking status to 'approved' and set action_by to the current user ID
      const updateBookingQuery = 'UPDATE bookings SET status = ?, action_by = ? WHERE id = ?';
      con.query(updateBookingQuery, ['approved', userId, bookingId], (err, result) => {
          if (err) {
              console.error('Error approving booking:', err);
              return res.status(500).send('Internal Server Error');
          }

          // Update status of the associated time slot in the time_slots table to 'reserved'
          const updateSlotQuery = 'UPDATE time_slots SET status = "reserved" WHERE slot_id = (SELECT slot_id FROM bookings WHERE id = ?)';
          con.query(updateSlotQuery, [bookingId], (error, result) => {
              if (error) {
                  console.error('Error updating slot status:', error);
                  return res.status(500).send('Internal Server Error');
              }
                 // Display success message using SweetAlert2
                Swal.fire({
                  icon: 'success',
                  title: 'Booking Successful!',
                  text: 'Your booking has been successfully processed.',
                  confirmButtonColor: '#3085d6',
                  confirmButtonText: 'OK'
                });
              // Redirect back to the dashboard or any other appropriate page
              res.redirect('/lecturer/dashboard');
          });
      });
  });
});

// Endpoint to handle booking reject
app.post('/lecturer/reject-booking', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
      // If the user is not logged in, redirect them to the login page
      return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  const { bookingId } = req.body;

  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
      if (error) {
          console.error('Error retrieving user information:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }

      // If the user is not found, send a 404 response
      if (results.length === 0) {
          return res.status(404).json({ message: 'User not found' });
      }

      // User found, extract user information
      const user = results[0];

      // Update booking status to 'approved' and set action_by to the current user ID
      const updateBookingQuery = 'UPDATE bookings SET status = ?, action_by = ? WHERE id = ?';
      con.query(updateBookingQuery, ['rejected', userId, bookingId], (err, result) => {
          if (err) {
              console.error('Error rejecting booking:', err);
              return res.status(500).send('Internal Server Error');
          }

          // Update status of the associated time slot in the time_slots table to 'reserved'
          const updateSlotQuery = 'UPDATE time_slots SET status = "free" WHERE slot_id = (SELECT slot_id FROM bookings WHERE id = ?)';
          con.query(updateSlotQuery, [bookingId], (error, result) => {
              if (error) {
                  console.error('Error updating slot status:', error);
                  return res.status(500).send('Internal Server Error');
              }
              
              // Redirect back to the dashboard or any other appropriate page
              res.redirect('/lecturer/dashboard');
          });
      });
  });

});

// Render lecturer history
app.get('/lecturer/history', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

     // Query to fetch booking history for the lecturer
  const query = `
  SELECT bookings.*, rooms.room_name, time_slots.start_time, time_slots.end_time, users.username
  FROM bookings 
  JOIN rooms ON bookings.room_id = rooms.room_id 
  JOIN time_slots ON bookings.slot_id = time_slots.slot_id 
  JOIN users ON bookings.user_id = users.user_id
  WHERE bookings.action_by = ?`;

con.query(query, [userId], (error, lecturerHistory) => {
  if (error) {
    // Handle error
    console.error('Error fetching booking history:', error);
    return res.status(500).send('Internal Server Error');
  }

  // Render the lecturer's booking history page with fetched data
    res.render('lecturer/lecturer_history', {lecturerHistory, user});
  });
  });
});

// Render staff dashboard
app.get('/staff/dashboard', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query database to get counts for different slot and room statuses
    const query = `
    SELECT 
        (SELECT COUNT(*) FROM time_slots) AS totalSlots,
        (SELECT COUNT(*) FROM time_slots WHERE status = 'free') AS freeSlots,
        (SELECT COUNT(*) FROM time_slots WHERE status = 'pending') AS pendingSlots,
        (SELECT COUNT(*) FROM time_slots WHERE status = 'reserved') AS reservedSlots,
        (SELECT COUNT(*) FROM time_slots WHERE status = 'disabled') AS disabledSlots
`;

    con.query(query, (error, results) => {
      if (error) {
        console.error('Error fetching counts:', error);
        return res.status(500).send('Internal Server Error');
      }

      const { totalSlots, freeSlots, pendingSlots, reservedSlots, disabledSlots } = results[0];

      // Render the staff dashboard with counts
      res.render('staff/staff_dashboard', { user, totalSlots, freeSlots, pendingSlots, reservedSlots, disabledSlots });
    });
  });
});

// Render room lists for Staff
app.get('/staff/room-lists', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Query to fetch rooms
    const roomsQuery = 'SELECT *, CONCAT("/img/", image_path) AS image_path FROM rooms';
    con.query(roomsQuery, (error, rooms) => {
      if (error) {
        console.error('Error retrieving rooms:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // Query to fetch time slots for each room
      const slotsQuery = 'SELECT * FROM time_slots';
      con.query(slotsQuery, (error, time_slots) => {
        if (error) {
          console.error('Error retrieving time slots:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Organize time slots by room
        rooms.forEach(room => {
          room.timeSlots = time_slots.filter(slot => slot.room_id === room.room_id);
        });

        // Render the user dashboard page with user information and rooms
        res.render('staff/staff_roomlist', { user, userId, rooms });
      });
    });
  });
});

//route handler for /staff/disabled-slots
app.get('/staff/disabled-slots', (req, res) => {
  // Retrieve query parameters from the request
  const { roomId, userId, slotId } = req.query;

  // Example SQL query to update status in the database
  const query = 'UPDATE time_slots SET status = ? WHERE slot_id = ?';
  const status = 'disabled';

  // Execute the SQL query with parameters
  con.query(query, [status, slotId], (error, results) => {
    if (error) {
      console.error('Error updating slot status:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Check if any slots were updated
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'No slot found with the provided ID' });
    }

    // If update was successful, return a success response
    // return res.status(200).json({ message: 'Slot disabled successfully' });
    return res.redirect('/staff/room-lists');
  });
});

//route handler for /staff/enabled-slots
app.get('/staff/enabled-slots', (req, res) => {
  // Retrieve query parameters from the request
  const { roomId, userId, slotId } = req.query;

  // Example SQL query to update status in the database
  const query = 'UPDATE time_slots SET status = ? WHERE slot_id = ?';
  const status = 'free';

  // Execute the SQL query with parameters
  con.query(query, [status, slotId], (error, results) => {
    if (error) {
      console.error('Error updating slot status:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // Check if any slots were updated
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'No slot found with the provided ID' });
    }

    // If update was successful, return a success response
    // return res.status(200).json({ message: 'Slot disabled successfully' });
    return res.redirect('/staff/room-lists');
  });
});

//route handler for staff add room
app.get('/staff/add-room', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    res.render('staff/staff_addroom', {user});
});
});

//POST route handler for processing room and time slot addition
app.post('/staff/add-room', upload.single('image'), (req,res) => {
  // Check if the use is logged in
  if(!req.session || !req.session.userId) {
    //If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if(error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error'});
    }

    // If the user is not found , send a 404 response
    if(results.length === 0){
      return res.status(404).json({message: 'user not found'});
    }

    // User found, extract user information
    const user = results[0];

    // Extract room and time slot data from the form submission
    const {roomName, slotData} = req.body;
    // Extract filename from the path
    const imagePath = path.basename(req.file.path);


    // Insert room data into the database
    con.query('INSERT INTO rooms (room_name, image_path) VALUES (?, ?)', [roomName, imagePath], (err, result) => {
      if(err) {
        console.error('Error inserting room data:', err);
        return res.status(500).json({ message: 'Error adding room'});
      }

      // Get the auto-generated room ID
      const roomId = result.insertId;

      // Insert each time slot into the database
      slotData.forEach(slot => {
        const{ startTime, endTime, status } =slot;
        con.query('INSERT INTO time_slots (room_id, start_time, end_time, status) VALUES (?, ?, ?, ?)', [roomId, startTime, endTime, status], (err, result) => {
          if(err){
            console.error('Error inserting time slot:', err);
            return res.status(500).json({message: 'Error adding time slot'});
          }
        });
      });
      // Redirect the user to a succes page page or back to the add_room page
      res.redirect('room-lists');
    });
  });
});

// GET route handler for fetching room details for editing
app.get('/staff/edit-room/:roomId', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

    // Retrieve room details based on the roomId parameter
    const roomId = req.params.roomId;
    con.query('SELECT * FROM rooms WHERE room_id = ?', [roomId], (error, results) => {
      if (error) {
        console.error('Error retrieving room details:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }

      // If the room is not found, send a 404 response
      if (results.length === 0) {
        return res.status(404).json({ message: 'Room not found' });
      }

      // Room found, extract room details
      const room = results[0];

      // Retrieve time slots for the room
      con.query('SELECT * FROM time_slots WHERE room_id = ?', [roomId], (error, results) => {
        if (error) {
          console.error('Error retrieving time slots:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }

        // Extract time slots
        const timeSlots = results;

        // Render the edit room form with room details and time slots
        res.render('staff/staff_editroom', { user, room, timeSlots });
      });
    });
  });
});

// POST route handler for updating room details and time slots
app.post('/staff/edit-room/:roomId', upload.single('image'), (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
      // If the user is not logged in, redirect them to the login page
      return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
      if (error) {
          console.error('Error retrieving user information:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }

      // If the user is not found, send a 404 response
      if (results.length === 0) {
          return res.status(404).json({ message: 'User not found' });
      }

      // User found, extract user information
      const user = results[0];

      // Extract room and time slot data from the form submission
      const { roomName, timeSlots } = req.body;
      const imagePath = req.file ? path.basename(req.file.path) : null; // Get image path if provided

      // Retrieve the existing image path from the database
      con.query('SELECT image_path FROM rooms WHERE room_id = ?', [req.params.roomId], (err, result) => {
          if (err) {
              console.error('Error retrieving existing image path:', err);
              return res.status(500).json({ message: 'Error retrieving existing image path' });
          }

          // Use the existing image path if no new image was uploaded
          const existingImagePath = result[0].image_path;

          // Update room details in the database
          const roomId = req.params.roomId;
          con.query('UPDATE rooms SET room_name = ?, image_path = ? WHERE room_id = ?', [roomName, imagePath || existingImagePath, roomId], (err, result) => {
              if (err) {
                  console.error('Error updating room data:', err);
                  return res.status(500).json({ message: 'Error updating room' });
              }

              // Update time slots for the room
              const timeSlotUpdates = timeSlots.map(slot => {
                  const { startTime, endTime, status } = slot;
                  return new Promise((resolve, reject) => {
                      con.query('UPDATE time_slots SET start_time = ?, end_time = ?, status = ? WHERE room_id = ? AND slot_id = ?', [startTime, endTime, status, roomId, slot.time_slot_id], (err, result) => {
                          if (err) {
                              console.error('Error updating time slot:', err);
                              reject(err);
                          } else {
                              resolve(result);
                          }
                      });
                  });
              });

              // Execute all time slot update queries
              Promise.all(timeSlotUpdates)
                  .then(() => {
                      // Redirect the user to the room list page
                      res.redirect('/staff/room-lists');
                  })
                  .catch(err => {
                      console.error('Error updating time slots:', err);
                      res.status(500).json({ message: 'Error updating time slots' });
                  });
          });
      });
  });
});

// Render all lecturer history
app.get('/staff/all-lecturers-history', (req, res) => {
  // Check if the user is logged in
  if (!req.session || !req.session.userId) {
    // If the user is not logged in, redirect them to the login page
    return res.redirect('/');
  }

  // Retrieve user information based on the session
  const userId = req.session.userId;
  con.query('SELECT * FROM users WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error('Error retrieving user information:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }

    // If the user is not found, send a 404 response
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // User found, extract user information
    const user = results[0];

     // Query to fetch booking history for the lecturer
     const query = `
  SELECT bookings.*, rooms.room_name, time_slots.start_time, time_slots.end_time, 
         booking_users.username AS student_name, action_users.username AS lecturer_name
  FROM bookings 
  JOIN rooms ON bookings.room_id = rooms.room_id 
  JOIN time_slots ON bookings.slot_id = time_slots.slot_id 
  JOIN users AS booking_users ON bookings.user_id = booking_users.user_id
  LEFT JOIN users AS action_users ON bookings.action_by = action_users.user_id`;


con.query(query, [userId], (error, allLecHistory) => {
  if (error) {
    // Handle error
    console.error('Error fetching booking history:', error);
    return res.status(500).send('Internal Server Error');
  }

  // Render the lecturer's booking history page with fetched data
    res.render('staff/all_lecturers_history', {allLecHistory, user});
  });
  });
});

// Renderlogout
app.get('/logout', (req, res) => {
  // Destroy the session
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
    // Redirect to the login page after logout
    res.redirect('/');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server is running...");
});