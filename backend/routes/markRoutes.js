const express = require("express");
const ctrl = require("../controllers/markController");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.route("/").get(ctrl.list).post(ctrl.create);
router.post("/bulk", ctrl.bulkCreate);
router.get("/student/:id", ctrl.byStudent);
router.route("/:id").put(ctrl.update).delete(ctrl.remove);

module.exports = router;
