import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    var is_error = this.element.classList.contains("alert-danger");

    // if (is_error){
    //     // setTimeout( this.style.display = "none",   )
    // }
    // setTimeout()
    // this.element.textContent = "Hello World!"
  }
}
