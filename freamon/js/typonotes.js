var ColorsFontsNum = 6;
var NoteColors = [
  "000000",
  "dd0a0a",
  "31adfe",
  "f2a510",
  "51d692",
  "e2569f",
  "6688ee", // Google Task Color
];
var NoteFonts = [
  { font: "BebasNeueRegular", fontsize: 68, lineheight: 58 },
  { font: "KomikaAxisRegular", fontsize: 46, lineheight: 46 },
  { font: "Orbitron", fontsize: 44, lineheight: 42 },
  { font: "SilkscreenNormal", fontsize: 52, lineheight: 38 },
  { font: "CodeProDemoRegular", fontsize: 54, lineheight: 48 },
  { font: "MuseoSlab500", fontsize: 46, lineheight: 46 },
];

$(document).ready(function () {
  // Check if JS is activated
  $(".check").hide();
  $(window).css("overflow", "auto");

  //Check browser features
  //todo

  // Init basic stuff
  TNinitFooter();
  TNinitBackground();
  TNinitMouseMove();
  TNinitUI();
  TNinitChannel();

  // Set some default values
  $(".notes")
    .data("editing", false)
    .data("snap", false)
    .data("hover", true)
    .data("initScale", 0.4)
    .data("initColor", 0)
    .data("initFont", 0);

  // Load all Notes on this wall
  TNloadWall();

  // Enable new Notes
  $(".notes").click(function (event) {
    if ($(event.target).hasClass("notes") && event.which === 1) {
      if (
        $(".notes").data("editing") == false &&
        event.clientX == $(".notes").data("x") &&
        event.clientY == $(".notes").data("y")
      ) {
        var scale = $(".notes").data("initScale");
        var x = event.clientX + $(window).scrollLeft() - 100 * scale;
        var y = event.clientY + $(window).scrollTop() - 100 * scale;

        TNcreateNote({ text: "", x: x, y: y })
          .show("scale", null, "fast", function () {
            $(this).trigger("click");
          })
          .TNinsertNote()
          .find(".note-input")
          .trigger("keydown");
      } else {
        $(".notes").data("editing", false);
      }
    }
  });
});

function TNloadNotes() {
  var data = JSON.stringify({
    wall: $(".notes").data("wall"),
  });

  $.ajax({
    type: "POST",
    url: "/loadwall",
    data: "data=" + data,
    success: function (notes) {
      if (notes.length > 0) {
        var i = 0,
          limit = notes.length,
          busy = false;
        var processor = setInterval(function () {
          if (!busy) {
            busy = true;

            TNcreateNote(notes[i])
              .show("scale", null, "fast")
              .find(".note-input")
              .trigger("keydown");

            if (++i == limit) {
              clearInterval(processor);
            }
            busy = false;
          }
        }, 100);
      }
    },
  });
}

function TNloadWall() {
  var data = JSON.stringify({
    wall: $(".notes").data("wall"),
  });
  $.ajax({
    type: "POST",
    url: "/loadsettings",
    data: "data=" + data,
    success: function (settings) {
      for (var property in settings) {
        var $t = $("#dot-" + property);
        var setting = settings[property];
        $t.data("active", setting.value)
          .data("text_true", setting.text_true)
          .data("text_false", setting.text_false)
          .TNtoggleDot();
      }
      // Settings must be loaded first
      TNloadNotes();

      // quick and ...
      if (!$("#dot-footer").data("active"))
        $(".bar-wrapper").css({ bottom: "0px" }).show();
      else $(".bar-wrapper").css({ bottom: "-125px" }).show();

      if (!$("#dot-grid").data("active")) $(".grid").show();
    },
  });
}

function defaultValues(data) {
  if (typeof data.x == "undefined") data.x = 25;
  if (typeof data.y == "undefined") data.y = 0;
  if (typeof data.scale == "undefined")
    data.scale = $(".notes").data("initScale");
  if (typeof data.color == "undefined")
    data.color = $(".notes").data("initColor");
  if (typeof data.font == "undefined") data.font = $(".notes").data("initFont");
  if (typeof data.text == "undefined") data.text = "";
  if (typeof data.id == "undefined") data.id = "";
  if (typeof data.z == "undefined") {
    var maxZ = 1;
    $(".note-wrapper").each(function () {
      if ($(this).data("z") > maxZ) maxZ = $(this).data("z");
    });
    data.z = maxZ + 1;
  }
  if (typeof data.counter == "undefined") data.counter = 0;
  if (typeof data.taskCompleted == "undefined") data.taskCompleted = false;

  return data;
}

function TNcreateNote(data) {
  // Check data availability
  data = defaultValues(data);

  // Create new Note
  var $t = $(".note-template")
    .clone()
    .removeClass("note-template")
    .appendTo(".notes");

  $t.attr("id", data.id)
    .css({ top: data.y + "px", left: data.x + "px", "z-index": data.z })
    // Assign Data
    .data("taskCompleted", data.taskCompleted)
    .data("counter", data.counter)
    .data("x", data.x)
    .data("y", data.y)
    .data("z", data.z)
    .data("scale", data.scale)
    .data("color", data.color)
    .data("font", data.font)
    .data("font-size", NoteFonts[data.font].fontsize)
    .data("line-height", NoteFonts[data.font].lineheight)
    // Init jQuery UI Compontes: Draggable + Resizeable
    .draggable({ scroll: false, snap: $("#dot-snap").data("active") })
    .resizable({
      aspectRatio: 1 / 1,
      handles: "se",
      minHeight: 32,
      minWidth: 32,
      maxHeight: 256,
      maxWidth: 256,
    })
    .bind("resize", function (event, ui) {
      try {
        var scale = ui.size.width / 200;
        $(this).data("scale", scale).TNresizeNote({ scale: scale });
      } catch (ex) {}
    })
    .bind("drag", function (event, ui) {
      /*var $t = $(this);
		var p = $t.position();
		$t.data('x',p.left).data('y',p.top);*/
    })
    .bind("resizestop", function (event, ui) {
      $(this).TNupdateNote();
    })
    .bind("dragstart", function (event, ui) {
      $(".pins").fadeTo("fast", 1);
      $(this).css("cursor", "move");
    })
    .bind("dragstop", function (event, ui) {
      var $note = $(this);
      $(".pins").fadeOut("fast");
      if (
        $(event.originalEvent.target).hasClass("dot") ||
        $(event.originalEvent.target).parents(".dot").length
      ) {
        // Delte Dot
        if (
          $(event.originalEvent.target).hasClass("delete-all") ||
          $(event.originalEvent.target).parents(".dot").hasClass("delete-all")
        ) {
          $(this).find(".delete").click();
        }

        // Goolge Tasks Pin
        if (
          $(event.originalEvent.target).hasClass("pin-tasks") ||
          $(event.originalEvent.target).parents(".dot").hasClass("pin-tasks")
        ) {
          var data = {
            wall: $(".notes").data("wall"),
            noteID: $note.attr("id"),
            title: $note.find(".note-input").val(),
          };

          // Has a specific list been targeted? (Only if more then 1)
          if (typeof $(event.originalEvent.target).attr("id") != "undefined")
            data.taskListID = $(event.originalEvent.target)
              .attr("id")
              .split("-")[2];
          else if (
            typeof $(event.originalEvent.target).parents(".dot").attr("id") !=
            "undefined"
          )
            data.taskListID = $(event.originalEvent.target)
              .parents(".dot")
              .attr("id")
              .split("-")[2];

          data = JSON.stringify(data);
          $.ajax({
            type: "POST",
            url: "/addtask",
            data: "data=" + data,
            success: function (data) {
              if (typeof data.error != "undefined") {
                if (data.error == "Forbidden") {
                  $("#" + data.note.id)
                    .TNresetNote(data.note)
                    .find(".note-input")
                    .trigger("keydown");
                }
                setError(data.error);
              } else {
                setError(false);
              }
            },
          });

          // Change Note color to Google blue
          $note
            .data("color", 6)
            .TNchangeColor({ color: NoteColors[6] })
            .find("#btn-complete")
            .show()
            .siblings("#btn-delete")
            .hide();
        }

        // Drag the Note back to its original Position
        $note.TNresetNote();
      } else {
        var p = $t.position();
        $note.data("x", p.left).data("y", p.top).TNupdateNote();
      }
      $note.css("cursor", "default");
    })
    // Enable Editing
    .click(function (event) {
      if (
        $(event.target).hasClass("note-text") ||
        $(event.target).hasClass("note-wrapper")
      ) {
        $(this).find(".note-header").show();
        $(this)
          .find(".note-text")
          .hide()
          .siblings(".note-input")
          .show()
          .select();
        $(".notes").data("editing", true);
      }
    })
    // Note Input
    .find(".note-input")
    .val(data.text)
    .keydown(function (event) {
      if (event.keyCode == "13") {
        $(this).trigger("blur");
        $(".notes").data("editing", false);
      } else {
        $(this).parents(".note-wrapper").TNchangeLineheight();
      }
    })
    .blur(function (event) {
      $(this)
        .parents(".note-wrapper")
        .TNhideInput()
        .TNupdateNote()
        .find(".note-header")
        .hide();
    })
    // Set passed Text
    .siblings(".note-text")
    .html(replaceURLWithHTMLLinks(data.text));

  // Header Menu
  $t.find("#btn-delete")
    .click(function () {
      var api = $(this).data("tooltip");
      var $tip = $(api.getTip());
      $tip.remove();
      $t.TNsetDeleted().TNremoveNote();
    })
    .siblings("#btn-color")
    .click(function (event) {
      var color = $t.TNgetNextColor();
      $t.TNchangeColor({ color: color });

      var api = $(this).data("tooltip");
      var $tip = $(api.getTip());
      $tip.css({ "background-color": "#" + color });
    })
    .siblings("#btn-font")
    .click(function () {
      var font = $t.TNgetNextFont();
      $t.TNchangeFont({ font: font });
    })
    .siblings("#btn-complete")
    .click(function () {
      $t.data("taskCompleted", !$t.data("taskCompleted")).TNdisplayCompleted();

      var data = {
        wall: $(".notes").data("wall"),
        noteID: $t.attr("id"),
        title: $t.find(".note-input").val(),
        taskCompleted: $t.data("taskCompleted"),
      };
      data = JSON.stringify(data);

      $.ajax({
        type: "POST",
        url: "/addtask",
        data: "data=" + data,
        success: function (data) {
          if (typeof data.error != "undefined") {
            if (data.error == "Forbidden") {
              $("#" + data.note.id)
                .TNresetNote(data.note)
                .find(".note-input")
                .trigger("keydown");
            }
            setError(data.error);
          } else {
            setError(false);
          }
        },
      });
    });

  // is Task?
  if (data.taskID != null) {
    $t.TNdisplayCompleted();
  }

  // is stacking down?
  if ($(".notes").data("stackdown") == "1") {
    $t.css({ "z-index": -data.z });
  }

  // Header Tooltips
  $t.find("[title]").tooltip({
    position: "center right",
    offset: [0, 5],
    delay: 0,
    predelay: 250,
    onBeforeShow: function () {
      var $tip = $(this.getTip()),
        $note = $(this.getTrigger()).parents(".note-wrapper");
      $tip.css({ "background-color": $note.css("background-color") });
    },
  });

  // Init Header Mouseover
  /*if($('#dot-hover').data('active') == false) {
		$t.TNinitNoteHover();
	}*/

  // Set passed values
  $t.TNresizeNote({ scale: data.scale })
    .TNchangeColor({ color: NoteColors[data.color] })
    .TNchangeFont({ font: NoteFonts[data.font].font });
  return $t;
}

$.fn.TNdisplayCompleted = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};

  if ($note.data("taskCompleted")) {
    $note
      .find(".note-text, .note-input")
      .css({ "text-decoration": "line-through" });
    $note.find("#btn-complete").hide().siblings("#btn-delete").show();
  } else {
    $note.find(".note-text, .note-input").css({ "text-decoration": "none" });
    $note.find("#btn-complete").show().siblings("#btn-delete").hide();
  }

  return $note;
};

$.fn.TNinitNoteHover = function () {
  var args = arguments[0] || {};

  if ("value" in args) {
    if (args.value == false) {
      $(".note-wrapper").unbind("mouseenter mouseleave");
      return this;
    }
  }

  return this.each(function () {
    $(this).hover(
      function () {
        $(this).find(".note-header").stop().fadeTo(0, 1);
      },
      function () {
        $(this)
          .find(".note-header")
          .stop()
          .fadeTo("fast", 0, function () {
            $(this).hide();
          });
      }
    );
  });
};

function TNprepareNoteData($note) {
  $note.data("counter", $note.data("counter") + 1);
  var d = new Date();
  var data = {
    counter: $note.data("counter"),
    timestamp: d.getTime(),
    x: $note.data("x"),
    y: $note.data("y"),
    z: $note.data("z"),
    scale: $note.data("scale"),
    color: $note.data("color"),
    font: $note.data("font"),
    text: $note.find(".note-input").val(),
    wall: $(".notes").data("wall"),
  };

  if (typeof $note.attr("id") != "undefined") data.id = $note.attr("id");

  return encodeURIComponent(JSON.stringify(data));
}

$.fn.TNinsertNote = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};
  var data = TNprepareNoteData($note);
  $.ajax({
    type: "POST",
    url: "/insert",
    data: "data=" + data,
    dataType: "json",
    success: function (data) {
      if (typeof data.error != "undefined") {
        if (data.error == "Forbidden") {
          $note.TNremoveNote();
        }
        setError(data.error);
      } else {
        setError(false);
        $note.attr("id", data.id);
      }
    },
  });
  return $note;
};

function setError(error) {
  if (error) $(".error").html(error).addClass("red");
  else $(".error").html("No errors").removeClass("red");
}

$.fn.TNhideInput = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};

  var $input = $note.find(".note-input");
  var text = replaceURLWithHTMLLinks($input.hide().val());
  if (!text) text = "";

  $input.trigger("keydown");
  $input.siblings(".note-text").html(text).show();
  return $note;
};

$.fn.TNupdateNote = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};
  var data = TNprepareNoteData($note);

  $.ajax({
    type: "POST",
    url: "/update",
    data: "data=" + data,
    dataType: "json",
    success: function (data) {
      if (typeof data.error != "undefined") {
        if (data.error == "Forbidden") {
          $("#" + data.note.id)
            .TNresetNote(data.note)
            .find(".note-input")
            .trigger("keydown");
        }
        if (data.error == "No special chars allowed") {
          $note.find(".note-text").html("");
          $note.find(".note-input").val("");
        }
        setError(data.error);
      } else {
        setError(false);
      }
    },
  });
  return $note;
};

$.fn.TNsetDeleted = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};
  var data = TNprepareNoteData($note);

  //if( typeof updateRequests[$note.attr('id')] != 'undefined')
  //updateRequests[$note.attr('id')].abort();

  $.ajax({
    type: "POST",
    url: "/delete",
    data: "data=" + data,
    dataType: "json",
    success: function (data) {
      if (typeof data.error != "undefined") {
        if (data.error == "Forbidden") {
          TNcreateNote(data.note)
            .show("scale", null, "fast")
            .find(".note-input")
            .trigger("keydown");
        }
        setError(data.error);
      } else {
        setError(false);
      }
    },
  });
  return $note;
};

// Todo: unify
$.fn.TNgetNextColor = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};
  var index = $note.data("color") || 0;

  index++;
  if (index >= ColorsFontsNum) index = 0;

  $note.data("color", index);
  $(".notes").data("initColor", index);

  return NoteColors[index];
};

$.fn.TNgetNextFont = function () {
  var $note = $(this[0]);
  var args = arguments[0] || {};
  var index = $note.data("font") || 0;

  index++;
  if (index >= ColorsFontsNum) index = 0;

  $note
    .data("font", index)
    .data("font-size", NoteFonts[index].fontsize)
    .data("line-height", NoteFonts[index].lineheight);
  $(".notes").data("initFont", index);

  return NoteFonts[index].font;
};

$.fn.TNchangeColor = function () {
  var $t = $(this[0]);
  var args = arguments[0] || {};
  var color = args.color;

  $t.css("background-color", "#" + color)
    .find(".note-button")
    .css({ "background-color": "#" + color /*, opacity:0.75*/ });

  return $t;
};

$.fn.TNchangeFont = function () {
  var $t = $(this[0]); // It's your element
  var args = arguments[0] || {}; // It's your object of arguments
  var font = args.font;

  $t.find(".note-input, .note-text").css({ "font-family": font });
  $t.TNchangeLineheight();

  return $t;
};

$.fn.TNchangeLineheight = function () {
  var $t = $(this[0]);
  var args = arguments[0] || {};

  var length = $t.find(".note-input").val().length;
  var scale = $t.data("scale");
  var fontIndex = $t.data("font");

  var fontsize = NoteFonts[fontIndex].fontsize * 2;
  var lineheight = NoteFonts[fontIndex].lineheight * 2;

  if (length >= 3) {
    fontsize = NoteFonts[fontIndex].fontsize * 1.3;
    lineheight = NoteFonts[fontIndex].lineheight * 1.3;
  }
  if (length >= 4) {
    fontsize = NoteFonts[fontIndex].fontsize;
    lineheight = NoteFonts[fontIndex].lineheight;
  }
  if (length >= 12) {
    fontsize = NoteFonts[fontIndex].fontsize / 1.5;
    lineheight = (NoteFonts[fontIndex].lineheight + 5) / 1.5;
  }
  if (length >= 28) {
    fontsize = NoteFonts[fontIndex].fontsize / 2;
    lineheight = (NoteFonts[fontIndex].lineheight + 5) / 2;
  }
  if (length >= 54) {
    fontsize = NoteFonts[fontIndex].fontsize / 2.8;
    lineheight = (NoteFonts[fontIndex].lineheight + 10) / 2.8;
  }
  if (length >= 116) {
    fontsize = NoteFonts[fontIndex].fontsize / 3;
    lineheight = (NoteFonts[fontIndex].lineheight + 10) / 3;
  }

  $t.find(".note-input")
    .css({
      "font-size": fontsize * scale + "px",
      "line-height": lineheight * scale + "px",
    })
    .parents(".note")
    .css({
      "font-size": fontsize * scale + "px",
      "line-height": lineheight * scale + "px",
    });

  $t.data("font-size", fontsize).data("line-height", lineheight);

  return $t;
};

$.fn.TNresizeNote = function () {
  var $t = $(this[0]);
  var args = arguments[0] || {};
  var scale = args.scale;
  var duration = args.duration || 0;
  var buttonSize = 200 * 0.26 * scale;

  $t.animate(
    { width: 200 * scale, height: 200 * scale },
    { queue: false, duration: duration }
  )
    .find(".note")
    .animate(
      {
        "font-size": $t.data("font-size") * scale + "px",
        "line-height": $t.data("line-height") * scale + "px",
      },
      { queue: false, duration: duration }
    )
    .find(".note-input")
    .animate(
      {
        "font-size": $t.data("font-size") * scale + "px",
        "line-height": $t.data("line-height") * scale + "px",
        width: 180 * scale + "px",
        height: 180 * scale + "px",
      },
      { queue: false, duration: duration }
    );

  $t.TNroundNoteCorners({ size: 200 * scale, duration: duration });

  $(".notes").data("initScale", scale);
  return $t;
};

$.fn.TNroundNoteCorners = function () {
  var args = arguments[0] || {};
  var size = args.size;
  var duration = args.duration || 0;
  return this.each(function () {
    var corner = size * 0.25 + "px";
    var rest = 2 + size * 0.01 + "px";
    $(this).animate(
      {
        "-moz-border-radius-topleft": rest,
        "-moz-border-radius-topright": rest,
        "-moz-border-radius-bottomright": corner,
        "-moz-border-radius-bottomleft": rest,
        "border-top-left-radius": rest,
        "border-top-right-radius": rest,
        "border-bottom-right-radius": corner,
        "border-bottom-left-radius": rest,
      },
      { queue: false, duration: duration }
    );
  });
};

$.fn.TNremoveNote = function () {
  var $t = $(this[0]);
  var args = arguments[0] || {};
  $t.draggable("destroy").resizable("destroy").remove();
};

function TNdeleteAll(dot) {
  $(".note-wrapper").each(function () {
    $(this).TNsetDeleted().TNremoveNote();
  });
}

function replaceURLWithHTMLLinks(text) {
  if (!text) return;
  var exp =
    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
  return text.replace(exp, '<a href="$1" target="_blank">$1</a>');
}

function popUpNote() {
  //http://www.javascript-coder.com/window-popup/javascript-window-open.phtml
  mywindow = window.open(
    "http://www.javascript-coder.com",
    "mywindow",
    "location=1,status=1,scrollbars=1,  width=100,height=100"
  );
  mywindow.moveTo(0, 0);
}

function TNinitMouseMove() {
  $(window)
    .mouseup(function () {
      //$('.notes').trigger('mouseup');
    })
    .keydown(function (event) {
      if (event.keyCode == "16") $(".notes").data("shift", true);
    })
    .keyup(function (event) {
      if (event.keyCode == "16") $(".notes").data("shift", false);
    });

  $(".notes")
    .data("down", false)
    .data("pLeft", 0)
    .data("pTop", 0)
    .data("shift", false)
    .mousedown(function (event) {
      if ($(event.target).hasClass("notes") !== true) return;
      var p = $(this).position();
      $(this)
        .data("down", true)
        .data("x", event.clientX)
        .data("y", event.clientY)
        .data("pLeft", $(window).scrollLeft())
        .data("pTop", $(window).scrollTop())
        .css("cursor", "move");
    })
    .mouseup(function (event) {
      $(this).data("down", false).css("cursor", "default");
    })
    .mousemove(function (event) {
      if ($(this).data("down")) {
        console.log("test");
        var dL =
            $(this).data("pLeft") + ($(this).data("x") - event.clientX) * 1.5,
          dT = $(this).data("pTop") + ($(this).data("y") - event.clientY) * 1.5;

        $(window).scrollLeft(dL);
        $(window).scrollTop(dT);
      }
    })
    .mouseleave(function () {
      if ($(this).data("down")) {
        $(this).trigger("mouseup");
      }
    })
    .mousewheel(function (event, delta) {
      if ($(".notes").data("shift") === false) {
        var dT = $(window).scrollTop() - delta * 180;
        $(window).scrollTop(dT);
      } else {
        var dL = $(window).scrollLeft() - delta * 180;
        $(window).scrollLeft(dL);
      }
    });
}

function TNinitFooter() {
  $(".header-wrapper")
    .data("closed", false)
    .click(function (event) {
      if ($(event.target).hasClass("header-wrapper")) {
        if ($(this).data("closed")) $(this).animate({ top: "0px" }, "fast");
        else $(this).animate({ top: "-22px" }, "fast");
        $(this).data("closed", !$(this).data("closed"));
      }
    });

  $(".bar-wrapper").click(function (event) {
    if ($(event.target).hasClass("bar-wrapper")) {
      $("#dot-footer").click();
    }
  });

  $(".block").hover(
    function () {
      $(this).find(".block-hide").stop().fadeTo("fast", 0.5);
    },
    function () {
      $(this).find(".block-hide").stop().fadeOut("fast");
    }
  );

  $(".block-hide").click(function () {
    $(this).parent().clone(true).appendTo(".bar");
    $(this).parent().remove();
  });
}

function TNinitBackground() {
  /*var $temp = $('.phone');
	for(i=2; i<10; i++){
		$temp.clone().appendTo('.background')
		.find('.length').html(i*480+'px')
		.siblings('.caption').find('.unit').html(i)
	}

	$('.length').each(function() {
		$(this).clone().css('top','490px').appendTo($(this).parent());
		$(this).clone().css('top','970px').appendTo($(this).parent());
		$(this).clone().css('top','1410px').appendTo($(this).parent());
		$(this).clone().css('top','1930px').appendTo($(this).parent());
	});*/

  var $temp = $(".quadrant");
  for (i = 1; i < 180; i++) {
    $temp
      .clone()
      .appendTo(".grid")
      .find(".x-length")
      .html(480 * (i % 9) + "px")
      .siblings(".y-length")
      .html(480 * Math.floor(i / 9) + "px");
  }
}

$.fn.TNupdateSettings = function () {
  var $t = $(this[0]);
  var args = arguments[0] || {};

  var property = $t.attr("id").split("-")[1];
  var value = $t.data("active");
  if ("property" in args && "value" in args) {
    property = args.property;
    value = args.value;
  }

  var data = JSON.stringify({
    wall: $(".notes").data("wall"),
    property: property,
    value: value,
  });

  $.ajax({
    type: "POST",
    url: "/settings",
    data: "data=" + data,
    success: function (data) {
      if ("value" in data) $t.TNtoggleDot({ active: data.value });
    },
  });
  return $t;
};

$.fn.TNtoggleDot = function () {
  var $t = $(this[0]);
  var args = arguments[0] || {};

  var active = $t.data("active");
  if ("active" in args) active = args.active;

  if (active) {
    $t.addClass("dot-active");
    $t.next().find(".text").html($t.data("text_true"));
  } else {
    $t.removeClass("dot-active");
    $t.next().find(".text").html($t.data("text_false"));
  }

  return $t;
};

function TNinitUI() {
  $(".ui .dot").tooltip({
    position: "center right",
    delay: 100,
    offset: [0, 8],
    relative: true,
    onBeforeShow: function () {
      this.getTrigger().addClass("dot-temp-active");
    },
    onBeforeHide: function () {
      this.getTrigger().removeClass("dot-temp-active");
    },
  });

  $(".pins .dot").tooltip({
    position: "center left",
    delay: 100,
    offset: [0, -8],
    relative: true,
    onBeforeShow: function () {
      this.getTrigger().addClass("dot-temp-active");
    },
    onBeforeHide: function () {
      this.getTrigger().removeClass("dot-temp-active");
    },
  });

  /*$('.dialog-new-wall').dialog({
		resizable: false,
		modal: true,
		draggable: false,
		autoOpen: false,
		height:200,
		width:200,
		buttons: {
			Ok: function() {
				window.location = $('.dialog-new-wall input').val();
				$(this).dialog( "close" );
			},
			Cancel: function() {
				$(this).dialog( "close" );
			}
		}
	}).keydown(function(event) {
		if( event.keyCode == '13') {
			window.location = $('.dialog-new-wall input').val();
		}
	});
	
	$('.dialog-delete-all').dialog({
		resizable: false,
		modal: true,
		draggable: false,
		autoOpen: false,
		height:200,
		width:200,
		buttons: {
			"Confirm": function() {
				TNdeleteAll(this);
				$(this).dialog( "close" );
			},
			Cancel: function() {
				$(this).dialog( "close" );
			}
		}
	});*/

  $(".new-wall").click(function () {
    $(".dialog-new-wall").dialog("open");
  });

  $("#dot-view").click(function () {
    var value = $(this).data("active");
    $(this).data("active", !value).TNupdateSettings();
  });
  $("#dot-edit").click(function () {
    var value = $(this).data("active");
    $(this).data("active", !value).TNupdateSettings();
  });
  $("#dot-snap").click(function () {
    var value = $(this).data("active");
    $(this).data("active", !value).TNupdateSettings();
    $(".note-wrapper").draggable("option", "snap", !value);
  });
  $("#dot-grid").click(function () {
    var value = $(this).data("active");
    $(this).data("active", !value).TNupdateSettings();

    if (!value) $(".grid").hide();
    else $(".grid").show();
  });
  $("#dot-hover").click(function () {
    /*var value = $(this).data('active');
		$(this).data('active',!value).TNupdateSettings();
		$('.note-wrapper').TNinitNoteHover({value:!!value});*/
  });
  $("#dot-footer").click(function () {
    var value = $(this).data("active");
    $(this).data("active", !value).TNupdateSettings();
    if (value) $(".bar-wrapper").animate({ bottom: "0px" }, "normal");
    else $(".bar-wrapper").animate({ bottom: "-125px" }, "normal");
  });

  $(".delete-all").click(function () {
    $(".dialog-delete-all").dialog("open");
  });
}

function TNinitChannel() {
  if (typeof $(".notes").data("token") != "undefined") {
    channel = new goog.appengine.Channel($(".notes").data("token"));
    socket = channel.open();

    socket.onopen = function () {
      setInterval(function () {
        keepAlive();
      }, 1000 * 60 * 5);
      keepAlive();
    };

    socket.onmessage = function (message) {
      var data = JSON.parse(message.data);
      var note = data.note;
      //console.log(data);

      if (
        data.wall_id == $(".notes").data("wall_id") &&
        data.visitor_id != $(".notes").data("visitor_id")
      ) {
        var $t = $("#" + note.id);

        if (note.deleted == false) {
          if ($t.length > 0) {
            $t.TNresetNote(note);
          } else {
            TNcreateNote(note).show("scale", null, "fast", function () {
              $(this).find(".note-input").trigger("keydown");
            });
          }
        } else {
          $t.TNremoveNote();
        }
      }
      $(".viewing-num").html(data.viewing_num);
    };

    socket.onerror = function () {
      setError("Channel Error. Try reloading the page");
    };
    socket.onclose = function () {};
  }
}

function keepAlive() {
  var d = new Date();
  data = JSON.stringify({
    wall: $(".notes").data("wall"),
    timestamp: d.getTime(),
  });

  $.ajax({
    type: "POST",
    url: "/keepalive",
    data: "data=" + data,
    dataType: "json",
    success: function (data) {
      $(".viewing-num").html(data.viewing_num);
    },
  });
}

$.fn.TNresetNote = function () {
  var $note = $(this[0]);
  var data = arguments[0] || {};

  if (typeof data.x == "undefined") data.x = $note.data("x");
  if (typeof data.y == "undefined") data.y = $note.data("y");
  if (typeof data.scale == "undefined") data.scale = $note.data("scale");
  if (typeof data.color == "undefined") data.color = $note.data("color");
  if (typeof data.font == "undefined") data.font = $note.data("font");
  if (typeof data.text == "undefined")
    data.text = $note.find(".note-input").val();
  if (typeof data.id == "undefined") data.id = $note.attr("id");
  if (typeof data.z == "undefined") data.z = $note.data("z");
  if (typeof data.counter == "undefined") data.counter = $note.data("counter");
  if (typeof data.taskCompleted == "undefined")
    data.taskCompleted = $note.data("taskCompleted");

  $note
    .animate({ top: data.y + "px", left: data.x + "px" }, "fast")
    .data("counter", data.counter)
    .data("x", data.x)
    .data("y", data.y)
    .data("z", data.z)
    .data("scale", data.scale)
    .data("color", data.color)
    .data("font", data.font)
    .data("counter", data.counter)
    .find(".note-input")
    .val(data.text)
    .siblings(".note-text")
    .html(replaceURLWithHTMLLinks(data.text));

  // is stacking down?
  if ($(".notes").data("stackdown")) {
    $t.css({ "z-index": -data.z });
  }

  $note
    .TNchangeColor({ color: NoteColors[data.color] })
    .TNchangeFont({ font: NoteFonts[data.font].font })
    .TNresizeNote({ scale: data.scale, duration: "fast" });
  return $note;
};
