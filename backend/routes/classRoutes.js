const express = require("express");
const Class = require("../models/Class");
const Student = require("../models/Students");
const makeCrud = require("../controllers/crudFactory");
const { protect, authorize } = require("../middleware/auth");

const crud = makeCrud(Class, "Class", {
  fields: ["name", "section"],
  inUse: (id) => Student.exists({ class: id })
});

const router = express.Router();
router.use(protect);

router.get("/", crud.list); // sab logged-in users dekh sakte hain
router.post("/", authorize("Admin"), crud.create);
router.put("/:id", authorize("Admin"), crud.update);
router.delete("/:id", authorize("Admin"), crud.remove);

module.exports = router;
