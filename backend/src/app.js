import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import path from 'node:path';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import receptionRoutes from './routes/receptionRoutes.js';
import collectionRoutes from './routes/collectionRoutes.js';
import extraRequestRoutes from './routes/extraRequestRoutes.js';
import reportEntryRoutes from './routes/reportEntryRoutes.js';
import reportApprovalRoutes from './routes/reportApprovalRoutes.js';
import finalReportRoutes from './routes/finalReportRoutes.js';
import sampleTypeRoutes from './routes/sampleTypeRoutes.js';
import patientManagementRoutes from './routes/patientManagementRoutes.js';
import preferenceRoutes from './routes/preferenceRoutes.js';
import counsellingRoutes from './routes/counsellingRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import laboratoryTestRoutes from './routes/laboratoryTestRoutes.js';
import publicReportRoutes from './routes/publicReportRoutes.js';
import clinicalInterpretationRoutes from './routes/clinicalInterpretationRoutes.js';
import pathologyRoutes from './routes/pathologyRoutes.js';
import radiologyRoutes from './routes/radiologyRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
app.use(helmet());
const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : []),
  process.env.PUBLIC_FRONTEND_URL?.trim(),
  'https://etu-diagonsatic-laboratory.onrender.com',
  'http://localhost:5173',
  'http://localhost:5000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests or matching origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(null, true); // Permissive CORS for public endpoints
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(mongoSanitize());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/extra-requests', extraRequestRoutes);
app.use('/api/report-entry', reportEntryRoutes);
app.use('/api/report-approvals', reportApprovalRoutes);
app.use('/api/final-reports', finalReportRoutes);
app.use('/api/sample-types', sampleTypeRoutes);
app.use('/api/patient-management', patientManagementRoutes);
app.use('/api/preferences', preferenceRoutes);
app.use('/api/counselling', counsellingRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/laboratory-tests', laboratoryTestRoutes);
app.use('/api/pathology', pathologyRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/clinical-interpretations', clinicalInterpretationRoutes);
app.use('/api/public', publicReportRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
