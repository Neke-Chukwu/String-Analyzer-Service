import express from 'express';
import { createString, getString, getAllStrings, naturalLanguageFilter, deleteString  } from "../controllers/stringController.js";

const router = express.Router();
router.post('/strings', createString);
router.get('/strings/:value', getString);
router.get('/strings', getAllStrings);
router.get('/strings/filter-by-natural-language', naturalLanguageFilter);
router.delete('/strings/:value', deleteString);

export default router;