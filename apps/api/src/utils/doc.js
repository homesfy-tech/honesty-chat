export function toPlainObject(doc) {
  if (!doc) {
    return null;
  }

  if (typeof doc.toObject === "function") {
    const plain = doc.toObject({ virtuals: true });
    plain.id = plain._id.toString();
    delete plain._id;
    delete plain.__v;
    return plain;
  }

  if (doc.id === undefined && doc._id) {
    return {
      ...doc,
      id: String(doc._id),
    };
  }

  return { ...doc };
}


