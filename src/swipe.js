import {events} from './data.js';
//onSwipe => function to run on swipe
class Swiper {
  constructor(onSwipe) {
    this.initialX = null;
    this.initialY = null;
    this.onSwipe = onSwipe;
    this.swiping = false;
    //how far the the reminder needs to be moved before it is deleted
    this.swipeThreshold = -250;
  }
  startTouch(e) {
    this.initialX = e.touches[0].clientX;
    this.initialY = e.touches[0].clientY;
  }
  async moveTouch(e) {
    //if the inital x and y have not been set exit the move touch
    if (this.initialX === null) {
      return;
    }
    if (this.initialY === null) {
      return;
    }
    //if a refresh swipe is in progress exit
    if(events.refreshSwiping){
      return;
    }
    //if the reminder is currently animating back into place exit
    if(e.currentTarget.classList.contains("slideIn")){
      return;
    }

    var currentX = e.touches[0].clientX;
    var currentY = e.touches[0].clientY;
    var diffX = this.initialX - currentX;
    var diffY = this.initialY - currentY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // sliding horizontally
      if (diffX > 0) {
        this.swiping = true;
        // swiped left
        var currentPos = e.currentTarget.style.left == "" ? 0 : e.currentTarget.style.left;

        if(parseInt(currentPos) >= this.swipeThreshold){
          e.currentTarget.style.left = parseInt(currentPos) - diffX + "px";
          console.log(parseInt(currentPos) - diffX);
        }

        this.initialX = currentX;

      } else {
        //stop dragging if this is a right swipe
        return;
      }
    }
    else{
      //stop dragging if this is an up or down swipe
      return;
    }

    e.preventDefault();
  }
  async endTouch(e) {
    this.swiping = false;

    this.initialX = null;
    this.initialY = null;

    //if the reminder was dragged far enough delete it
    if(parseInt(e.currentTarget.style.left) <= this.swipeThreshold){
      e.currentTarget.classList.add("slideOut");
      await this.onSwipe(e.currentTarget.id, e.currentTarget.getAttribute("index"));
    }
    //if the reminder was not dragged far enough slide it back into place
    else{
      e.currentTarget.classList.add("slideIn");
    }

  }
}


export{Swiper};
