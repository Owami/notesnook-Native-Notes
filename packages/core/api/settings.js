import { EV } from "../common";
import id from "../utils/id";

class Settings {
  /**
   *
   * @param {import("./index").default} db
   */
  constructor(db) {
    this._db = db;
    this._settings = {
      type: "settings",
      id: id(),
      pins: [],
      dateEdited: 0,
      dateCreated: Date.now(),
    };
  }

  get raw() {
    return this._settings;
  }

  async merge(item) {
    this._settings = {
      ...this._settings,
      ...item,
    };
    await this._db.context.write("settings", this._settings);
  }

  async init() {
    var settings = await this._db.context.read("settings");
    if (!settings) await this._db.context.write("settings", this._settings);
    else this._settings = settings;
    EV.subscribe("user:loggedOut", () => {
      this._settings = {
        type: "settings",
        id: id(),
        pins: [],
        dateEdited: 0,
        dateCreated: Date.now(),
      };
    });
  }

  async pin(type, data) {
    if (type !== "notebook" && type !== "topic" && type !== "tag")
      throw new Error("This item cannot be pinned.");
    if (this.isPinned(data.id)) return;
    this._settings.pins.push({ type, data });
    this._settings.dateEdited = Date.now();
    await this._db.context.write("settings", this._settings);
  }

  async unpin(id) {
    const index = this._settings.pins.findIndex((i) => i.data.id === id);
    if (index <= -1) return;
    this._settings.pins.splice(index, 1);
    this._settings.dateEdited = Date.now();
    await this._db.context.write("settings", this._settings);
  }

  isPinned(id) {
    return this._settings.pins.findIndex((v) => v.data.id === id) > -1;
  }

  get pins() {
    return this._settings.pins.reduce((prev, pin) => {
      if (pin.type === "notebook") {
        prev.push(this._db.notebooks.notebook(pin.data.id).data);
      } else if (pin.type === "topic") {
        prev.push(
          this._db.notebooks
            .notebook(pin.data.notebookId)
            .topics.topic(pin.data.id)._topic
        );
      } else if (pin.type === "tag") {
        prev.push(this._db.tags.tag(pin.data.id));
      }
      return prev;
    }, []);
  }
}
export default Settings;
