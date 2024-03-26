// src/controllers/hello_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // console.log("Hello, Stimulus!", this.element)
  }
  static targets = [ "create_form", "upload_form"]

  toggle_form(){
    const element1 = this.create_formTarget
    const element2 = this.upload_formTarget
    if (element1.style.getPropertyValue("display") != "none"){
      element1.style.display = "none";
      element2.style.display = "block";
    }else{
      element1.style.display = "block";
      element2.style.display = "none";
    }
  }

}