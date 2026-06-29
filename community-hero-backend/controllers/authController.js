const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  verifyPointInsideSociety
} = require('../utils/geofenceService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const formatUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  societyId: user.societyId || null,
  pendingSocietyId: user.pendingSocietyId || null,
  joinStatus: user.joinStatus || 'none',
  lastKnownLocation: user.lastKnownLocation || null
});

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const safeRole = role === 'admin' ? 'admin' : 'resident';

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: safeRole,
      societyId: null,
      pendingSocietyId: null,
      joinStatus: safeRole === 'admin' ? 'approved' : 'none'
    });

    return res.status(201).json({
      ...formatUser(user),
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Registration failed.' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, role, latitude, longitude } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Access Denied: You do not have ${role} privileges.`
      });
    }

    const requiresLocationCheck = user.role === 'resident' && user.societyId && user.joinStatus === 'approved';

    if (requiresLocationCheck) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(428).json({
          code: 'GPS_REQUIRED',
          error: 'High-accuracy GPS coordinates are required for this community account.'
        });
      }

      const societyCheck = await verifyPointInsideSociety({
        societyId: user.societyId,
        latitude,
        longitude
      });

      if (!societyCheck.ok) {
        return res.status(societyCheck.status).json({
          error: societyCheck.status === 403
            ? 'Access Denied: You must be physically present within the community bounds to log in.'
            : societyCheck.error,
          distanceMeters: societyCheck.distanceMeters,
          radiusInMeters: societyCheck.radiusInMeters
        });
      }

      await User.findByIdAndUpdate(user._id, {
        lastKnownLocation: {
          latitude: societyCheck.parsedLat,
          longitude: societyCheck.parsedLng,
          verifiedAt: new Date()
        }
      });
    }

    const freshUser = await User.findById(user._id);

    return res.json({
      ...formatUser(freshUser),
      token: generateToken(user._id),
      verificationRequired: Boolean(requiresLocationCheck)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login processing failed.' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(formatUser(user));
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ error: 'Failed to load current user.' });
  }
};

module.exports = { registerUser, loginUser, getMe };
