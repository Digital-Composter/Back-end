//routes.js
const express = require("express");
const router = express.Router();
const { register, 
    logIn, 
    getUser, 
    getRealtime, 
    postRealtime, 
    postRecords,
    getRecords, 
    getControl, 
    putControlTemp, 
    putControlMoist, 
    deactivateDevice, 
    activateDevice, 
    getState,
    getDays,
    calculateFIS,
    getFuzzy } = require("../handler/handler");
const { authenticateToken } = require("../middleware/jsonwebtoken");


// Define routes
router.post("/user", register);
router.post("/user/login", logIn);
router.get("/user", authenticateToken, getUser); 
router.get("/data/realtime", getRealtime); 
router.post("/data/realtime", postRealtime);
router.post("/data/records", postRecords); 
router.get("/data/records", getRecords); 
router.get("/control", getControl); 
router.put("/control/temperature", putControlTemp); 
router.put("/control/moisture", putControlMoist); 
router.put("/state/activate", activateDevice);
router.put("/state/deactivate", deactivateDevice);
router.get("/state", getState);
router.get("/state/days", getDays);
router.post("/fuzzy", calculateFIS);
router.get("/fuzzy", getFuzzy);

module.exports = router;