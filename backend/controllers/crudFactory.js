// Classes aur Subjects ke liye simple CRUD.
// fields: client sirf yehi fields set kar sakta hai. inUse(id): agar kahin istemal ho raha ho to delete roko.
const HttpError = require("../utils/httpError");
const { isId, pick } = require("../utils/helpers");

module.exports = (Model, label, { fields, inUse } = {}) => {
  const body = (req) => (fields ? pick(req.body, fields) : req.body);
  const checkId = (id) => {
    if (!isId(id)) throw new HttpError(400, `Invalid ${label} ID`);
  };
  const duplicate = (err) => {
    if (err.code === 11000) throw new HttpError(409, `${label} pehle se maujood hai`);
    throw err;
  };

  return {
    list: async (req, res) => {
      res.json(await Model.find().sort({ name: 1 }));
    },

    create: async (req, res) => {
      try {
        res.status(201).json(await Model.create(body(req)));
      } catch (err) {
        duplicate(err);
      }
    },

    update: async (req, res) => {
      checkId(req.params.id);
      try {
        const doc = await Model.findByIdAndUpdate(
          req.params.id,
          { $set: body(req) },
          { new: true, runValidators: true }
        );
        if (!doc) throw new HttpError(404, `${label} nahi mili`);
        res.json(doc);
      } catch (err) {
        duplicate(err);
      }
    },

    remove: async (req, res) => {
      checkId(req.params.id);
      if (inUse && (await inUse(req.params.id))) {
        throw new HttpError(409, `${label} istemal mein hai (students ya marks se juri hai), pehle unhe hata dein`);
      }
      const doc = await Model.findByIdAndDelete(req.params.id);
      if (!doc) throw new HttpError(404, `${label} nahi mili`);
      res.json({ message: `${label} delete ho gayi` });
    }
  };
};
