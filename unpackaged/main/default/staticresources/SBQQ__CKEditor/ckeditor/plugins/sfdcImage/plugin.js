/*
 Copyright (c) 2003-2014, CKSource - Frederico Knabben. All rights reserved.
 For licensing, see LICENSE.md or http://ckeditor.com/license
 */
(function () {
	function c(b, a) {
		a || (a = b.getSelection().getSelectedElement());
		if (a && a.is("img") && !a.data("cke-realelement") && !a.isReadOnly())return a
	}

	CKEDITOR.plugins.add("sfdcImage", {
		requires: "dialog",
		lang: "af,ar,bg,bn,bs,ca,cs,cy,da,de,el,en,en-au,en-ca,en-gb,eo,es,et,eu,fa,fi,fo,fr,fr-ca,gl,gu,he,hi,hr,hu,id,is,it,ja,ka,km,ko,ku,lt,lv,mk,mn,ms,nb,nl,no,pl,pt,pt-br,ro,ru,si,sk,sl,sq,sr,sr-latn,sv,th,tr,tt,ug,uk,vi,zh,zh-cn",
		icons: "sfdcImage",
		hidpi: !0,
		init: function (b) {
			(typeof LC !== "undefined" && LC.labels && LC.labels.sfdcSwitchToText) && (b.config.sfdcLabels.CkeImageDialog = LC.labels.CkeImageDialog);
			if (!b.plugins.image2 && !b.plugins.image) {
				CKEDITOR.dialog.add("sfdcImage", this.path + "dialogs/sfdcImage.js");
				var a = "img[alt,!src]{border-style,border-width,float,height,margin,margin-bottom,margin-left,margin-right,margin-top,width}";
				CKEDITOR.dialog.isTabEnabled(b, "sfdcImage", "advanced") && (a = "img[alt,dir,id,lang,longdesc,!src,title]{*}(*)");
				b.addCommand("sfdcImage", new CKEDITOR.dialogCommand("sfdcImage", {
					allowedContent: a, requiredContent: "img[src]",
					contentTransformations: [["img{width}: sizeToStyle", "img[width]: sizeToAttribute"], ["img{float}: alignmentToStyle", "img[align]: alignmentToAttribute"]]
				}));
				b.ui.addButton && b.ui.addButton("SfdcImage", {
					label: b.lang.common.image,
					command: "sfdcImage",
					toolbar: "insert,10"
				});
				b.on("doubleclick", function (b) {
					var a = b.data.element;
					if (a.is("img") && !a.data("cke-realelement") && !a.isReadOnly())b.data.dialog = "sfdcImage"
				});
				b.contextMenu && b.contextMenu.addListener(function (a) {
					if (c(b, a))return {image: CKEDITOR.TRISTATE_OFF}
				})
			}
		},
		afterInit: function (b) {
			function a(a) {
				var d = b.getCommand("justify" + a);
				if (d && ("left" == a || "right" == a))d.on("exec", function () {
					var a = c(b);
					a && a.removeStyle("float")
				})
			}

			!b.plugins.image2 && !b.plugins.image && (a("left"), a("right"), a("center"), a("block"))
		}
	})
})();
CKEDITOR.config.image_removeLinkByEmptyURL = !0;