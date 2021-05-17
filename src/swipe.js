//onSwipe => function to run on swipe
class Swiper {
  constructor(onSwipe) {
    this.initialX = null;
    this.initialY = null;
    this.onSwipe = onSwipe;
  }
  startTouch(e) {
    this.initialX = e.touches[0].clientX;
    this.initialY = e.touches[0].clientY;
    e.currentTarget.classList.remove("slideIn");
  }
  moveTouch(e) {
    if (this.initialX === null) {
      return;
    }
    if (this.initialY === null) {
      return;
    }

    var currentX = e.touches[0].clientX;
    var currentY = e.touches[0].clientY;
    var diffX = this.initialX - currentX;
    var diffY = this.initialY - currentY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // sliding horizontally
      if (diffX > 0) {
        // swiped left
        var currentPos = e.currentTarget.style.left == "" ? 0 : e.currentTarget.style.left;
        if(parseInt(currentPos) >= -200){
          e.currentTarget.style.left = parseInt(currentPos) - diffX;
        }
        else{
          e.currentTarget.classList.add("slideOut");
          this.onSwipe(e.currentTarget.id).then((result)=>{
            console.log(result);
          })
          this.initialX = null;
          this.initialY = null;
        }
        this.initialX = currentX;
      } else {
        // swiped right
        //this.initialX = currentX;
      }
    }

    e.preventDefault();
  }
  endTouch(e) {
    e.currentTarget.classList.add("slideIn");
    e.currentTarget.style.left = "0px";
  }
}


export{Swiper};
