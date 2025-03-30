import { Request, Response, Router } from 'express';
import patientRouter from './patient.routes';
import {
    createPatient,
    deletePatient,
    getAllPatients,
    getPatientById,
    updatePatient,
} from '../controllers/patient.controller'; // 引入所有需要的 controller 函數
import authRouter from './auth.routes'; // <--- 引入 Auth 路由
import authMiddleware from '../middleware/auth.middleware'; // <--- 引入 Auth Middleware

const router = Router();

// 健康檢查端點 (Health Check Endpoint)
router.get('/api/health', (req: Request, res: Response): void => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        // env: config.nodeEnv, // 可選：顯示環境
    });
});
router.use('/api/auth', authRouter); // <--- 掛載 Auth 路由

// --- 在此掛載其他特定功能的路由 ---
// 例如： import patientRouter from './patient.routes';
router.use('/api/patients', authMiddleware, patientRouter); // <--- 掛載
router.get('/', getAllPatients); // GET /api/patients
router.post('/', createPatient); // POST /api/patients
router.get('/:id', getPatientById); // GET /api/patients/:id
router.put('/:id', updatePatient); // PUT /api/patients/:id
router.delete('/:id', deletePatient); // DELETE /api/patients/:id
// 根路徑回應 (可選)
router.get('/api', (req: Request, res: Response) => {
    res.json({ message: 'EHR FHIR Backend API is running!' });
});

export default router;
