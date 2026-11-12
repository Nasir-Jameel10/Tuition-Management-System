const express = require("express");
const Subject = require("../models/Subject");
const Student = require("../models/Students");
const Mark = require("../models/Mark");
const makeCrud = require("../controllers/crudFactory");
const { protect, authorize } = require("../middleware/auth");

const crud = makeCrud(Subject, "Subject", {
  fields: ["name"],
  inUse: async (id) => (await Student.exists({ subjects: id })) || (await Mark.exists({ subject: id }))
});

const router = express.Router();
router.use(protect);

router.get("/", crud.list);
router.post("/", authorize("Admin"), crud.create);
router.put("/:id", authorize("Admin"), crud.update);
router.delete("/:id", authorize("Admin"), crud.remove);

module.exports = router;
