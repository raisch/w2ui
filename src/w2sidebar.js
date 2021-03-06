/************************************************************************
*   Library: Web 2.0 UI for jQuery (using prototypical inheritance)
*   - Following objects defined
* 		- w2sidebar	  - sidebar widget
*		- $.w2sidebar - jQuery wrapper
*   - Dependencies: jQuery, w2utils
*
* == NICE TO HAVE ==
* 	- context menus
*
* == 1.3 Changes ==
*	- animated open/close
*	- add keyboard property
*	- added onKeyboard event
*
************************************************************************/

(function () {
	var w2sidebar = function (options) {
		this.name			= null;
		this.box 			= null;
		this.sidebar		= null;
		this.parent 		= null;
		this.img 			= null;
		this.icon 			= null;
		this.style	 		= '';
		this.selected 		= null;	// current selected node (readonly)
		this.nodes	 		= []; 	// Sidebar child nodes
		this.topHTML		= '';
		this.bottomHTML     = '';
		this.keyboard		= true;
		this.onClick		= null;	// Fire when user click on Node Text
		this.onDblClick		= null;	// Fire when user dbl clicks
		this.onContextMenu	= null;	
		this.onExpand		= null;	// Fire when node Expands
		this.onCollapse		= null;	// Fire when node Colapses
		this.onKeyboard		= null;
		this.onRender 		= null;
		this.onRefresh		= null;
		this.onResize 		= null;
		this.onDestroy	 	= null;
	
		$.extend(true, this, options);
	}
	
	// ====================================================
	// -- Registers as a jQuery plugin
	
	$.fn.w2sidebar = function(method) {
		if (typeof method === 'object' || !method ) {
			// check required parameters
			if (!method || typeof method.name == 'undefined') {
				console.log('ERROR: The parameter "name" is required but not supplied in $().w2sidebar().');
				return;
			}
			if (typeof w2ui[method.name] != 'undefined') {
				console.log('ERROR: The parameter "name" is not unique. There are other objects already created with the same name (obj: '+ method.name +').');
				return;			
			}
			if (!w2utils.isAlphaNumeric(method.name)) {
				console.log('ERROR: The parameter "name" has to be alpha-numeric (a-z, 0-9, dash and underscore). ');
				return;			
			}
			// extend items
			var nodes  = method.nodes;
			var object = new w2sidebar(method); 
			$.extend(object, { handlers: [], nodes: [] });
			if (typeof nodes != 'undefined') {
				object.add(object, nodes); 
			}
			if ($(this).length != 0) {
				object.render($(this)[0]);
			}
			object.sidebar = object;
			// register new object
			w2ui[object.name] = object;
			return object;
			
		} else if (w2ui[$(this).attr('name')]) {
			var obj = w2ui[$(this).attr('name')];
			obj[method].apply(obj, Array.prototype.slice.call(arguments, 1));
			return this;
		} else {
			console.log('ERROR: Method ' +  method + ' does not exist on jQuery.w2sidebar' );
		}    
	};
	
	// ====================================================
	// -- Implementation of core functionality
	
	w2sidebar.prototype = {
		node: {
			id	 			: null,
			text	   		: '',
			count			: '',
			img 			: null,
			icon 			: null,
			nodes	  		: [],
			style 			: '',
			selected 		: false,
			expanded 		: false,
			hidden			: false,
			disabled		: false,
			group			: false, 	// if true, it will build as a group
			plus 			: false,	// if true, plus will be shown even if there is no sub nodes
			// events
			onClick			: null,
			onDblClick		: null,
			onContextMenu	: null,
			onExpand		: null,
			onCollapse		: null,
			// internal
			parent	 		: null,		// node object
			sidebar			: null
		},
		
		add: function (parent, nodes) {
			if (arguments.length == 1) {
				// need to be in reverse order
				nodes  = arguments[0];
				parent = this;
			}
			if (typeof parent == 'string') parent = this.get(parent);
			return this.insert(parent, null, nodes);
		},
		
		insert: function (parent, before, nodes) {
			if (arguments.length == 2) {
				// need to be in reverse order
				nodes   = arguments[1];
				before	= arguments[0];
				var ind = this.get(before);
				if (ind == null) {
					var txt = (nodes[o].caption != 'undefined' ? nodes[o].caption : nodes[o].text);
					console.log('ERROR: Cannot insert node "'+ txt +'" because cannot find node "'+ before +'" to insert before.'); 
					return null; 
				}
				parent 	= this.get(before).parent;
			}
			if (typeof parent == 'string') parent = this.get(parent);
			if (!$.isArray(nodes)) nodes = [nodes];
			for (var o in nodes) {
				if (typeof nodes[o].id == 'undefined') { 
					var txt = (nodes[o].caption != 'undefined' ? nodes[o].caption : nodes[o].text);					
					console.log('ERROR: Cannot insert node "'+ txt +'" because it has no id.'); 
					continue;
				}
				if (this.get(this, nodes[o].id) != null) { 
					var txt = (nodes[o].caption != 'undefined' ? nodes[o].caption : nodes[o].text);
					console.log('ERROR: Cannot insert node with id='+ nodes[o].id +' (text: '+ txt + ') because another node with the same id already exists.'); 
					continue;
				}
				var tmp = $.extend({}, w2sidebar.prototype.node, nodes[o]);
				tmp.sidebar= this;
				tmp.parent = parent;
				var nd = tmp.nodes;
				tmp.nodes  = []; // very important to re-init empty nodes array
				if (before == null) { // append to the end
					parent.nodes.push(tmp);	
				} else {
					var ind = this.get(parent, before, true);
					if (ind == null) {
						var txt = (nodes[o].caption != 'undefined' ? nodes[o].caption : nodes[o].text);
						console.log('ERROR: Cannot insert node "'+ txt +'" because cannot find node "'+ before +'" to insert before.'); 
						return null; 
					}
					parent.nodes.splice(ind, 0, tmp);
				}
				if (typeof nd != 'undefined' && nd.length > 0) { this.insert(tmp, null, nd); }
			}
			this.refresh(parent.id);
			return tmp;
		},
		
		remove: function () { // multiple arguments
			var deleted = 0;
			for (var a = 0; a < arguments.length; a++) {
				var tmp = this.get(arguments[a]);
				if (tmp == null) continue;
				var ind  = this.get(tmp.parent, arguments[a], true);
				if (ind == null) continue;
				tmp.parent.nodes.splice(ind, 1);
				deleted++;
			}
			if (deleted > 0 && arguments.length == 1) this.refresh(tmp.parent.id); else this.refresh();
			return deleted;
		},
		
		set: function (parent, id, node) { 
			if (arguments.length == 2) {
				// need to be in reverse order
				node    = id;
				id 		= parent;
				parent 	= this;
			}
			// searches all nested nodes
			this._tmp = null;
			if (typeof parent == 'string') parent = this.get(parent);
			if (parent.nodes == null) return null;
			for (var i=0; i < parent.nodes.length; i++) {
				if (parent.nodes[i].id == id) {
					// make sure nodes inserted correctly
					var nodes  = node.nodes;
					$.extend(parent.nodes[i], node, { nodes: [] });
					if (typeof nodes != 'undefined') {
						this.add(parent.nodes[i], nodes); 
					}					
					this.refresh(id);
					return true;
				} else {
					this._tmp = this.set(parent.nodes[i], id, node);
					if (this._tmp) return true;
				}
			}
			return false;
		},
		
		get: function (parent, id, returnIndex) { // can be just called get(id) or get(id, true)
			if (arguments.length == 1 || (arguments.length == 2 && id === true) ) {
				// need to be in reverse order
				returnIndex = id;
				id 		= parent;
				parent 	= this;
			}
			// searches all nested nodes
			this._tmp = null;
			if (typeof parent == 'string') parent = this.get(parent); 
			if (parent.nodes == null) return null;
			for (var i=0; i < parent.nodes.length; i++) {
				if (parent.nodes[i].id == id) {
					if (returnIndex === true) return i; else return parent.nodes[i];
				} else {
					this._tmp = this.get(parent.nodes[i], id, returnIndex);
					if (this._tmp || this._tmp === 0) return this._tmp;
				}
			}
			return this._tmp;
		},
		
		hide: function () { // multiple arguments
			var hidden = 0;
			for (var a = 0; a < arguments.length; a++) {
				var tmp = this.get(arguments[a]);
				if (tmp == null) continue;
				tmp.hidden = true;
				hidden++;
			}
			if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
			return hidden;
		},
		
		show: function () {
			var shown = 0;
			for (var a = 0; a < arguments.length; a++) {
				var tmp = this.get(arguments[a]);
				if (tmp == null) continue;
				tmp.hidden = false;
				shown++;
			}
			if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
			return shown;
		},
	
		disable: function () { // multiple arguments
			var disabled = 0;
			for (var a = 0; a < arguments.length; a++) {
				var tmp = this.get(arguments[a]);
				if (tmp == null) continue;
				tmp.disabled = true;
				if (tmp.selected) this.unselect(tmp.id);
				disabled++;
			}
			if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
			return disabled;
		},
		
		enable: function () { // multiple arguments
			var enabled = 0;
			for (var a = 0; a < arguments.length; a++) {
				var tmp = this.get(arguments[a]);
				if (tmp == null) continue;
				tmp.disabled = false;
				enabled++;
			}
			if (arguments.length == 1) this.refresh(arguments[0]); else this.refresh();
			return enabled;
		},

		select: function (id) {
			if (this.selected == id) return false;
			this.unselect(this.selected);
			var new_node = this.get(id);
			if (!new_node) return false;
			$(this.box).find('#node_'+ w2utils.escapeId(id))
				.addClass('w2ui-selected')
				.find('.w2ui-icon').addClass('w2ui-icon-selected');
			new_node.selected = true;
			this.selected = id;
		},
		
		unselect: function (id) {
			var current = this.get(id);
			if (!current) return false;
			current.selected = false;
			$(this.box).find('#node_'+ w2utils.escapeId(id))
				.removeClass('w2ui-selected')
				.find('.w2ui-icon').removeClass('w2ui-icon-selected');
			if (this.selected == id) this.selected = null;
			return true;
		},

		toggle: function(id) {
			var nd = this.get(id);
			if (nd == null) return;
			if (nd.plus) {
				this.set(id, { plus: false });
				this.expand(id);
				this.refresh(id);
				return;
			}
			if (nd.nodes.length == 0) return;
			if (this.get(id).expanded) this.collapse(id); else this.expand(id);
		},
	
		expand: function (id) {
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'expand', target: id });	
			if (eventData.stop === true) return false;
			// default action
			var nd = this.get(id);
			$(this.box).find('#node_'+ w2utils.escapeId(id) +'_sub').slideDown('fast');
			$(this.box).find('#node_'+ w2utils.escapeId(id) +' .w2ui-node-dots:first-child').html('<div class="w2ui-expand">-</div>');
			nd.expanded = true;
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
			this.resize();
		},
		
		collapse: function (id) {
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'collapse', target: id });	
			if (eventData.stop === true) return false;
			// default action
			$(this.box).find('#node_'+ w2utils.escapeId(id) +'_sub').slideUp('fast');		
			$(this.box).find('#node_'+ w2utils.escapeId(id) +' .w2ui-node-dots:first-child').html('<div class="w2ui-expand">+</div>');
			this.get(id).expanded = false;
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
			this.resize();
		},

		collapseAll: function (parent) {
			if (typeof parent == 'undefined') parent = this;
			if (typeof parent == 'string') parent = this.get(parent); 
			if (parent.nodes == null) return null;
			for (var i=0; i < parent.nodes.length; i++) {
				if (parent.nodes[i].expanded === true) parent.nodes[i].expanded = false;
				if (parent.nodes[i].nodes && parent.nodes[i].nodes.length > 0) this.collapseAll(parent.nodes[i]);
			}
			this.refresh(parent.id);
		},		
		
		expandAll: function (parent) {
			if (typeof parent == 'undefined') parent = this;
			if (typeof parent == 'string') parent = this.get(parent); 
			if (parent.nodes == null) return null;
			for (var i=0; i < parent.nodes.length; i++) {
				if (parent.nodes[i].expanded === false) parent.nodes[i].expanded = true;
				if (parent.nodes[i].nodes && parent.nodes[i].nodes.length > 0) this.collapseAll(parent.nodes[i]);
			}
			this.refresh(parent.id);
		},		

		expandParents: function (id) {
			var node = this.get(id);
			if (node == null) return;
			if (node.parent) {
				node.parent.expanded = true;
				this.expandParents(node.parent.id);
			}
			this.refresh(id);
		}, 

		doClick: function (id, event) {
			var nd  = this.get(id);
			var obj = this;
			if (nd.disabled) return;
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'click', target: id, event: event });	
			if (eventData.stop === true) return false;
			// default action
			if (!nd.group && !nd.disabled) {
				$(this.box).find('.w2ui-node').each(function (index, field) {
					var nid = String(field.id).replace('node_', '');
					var nd  = obj.get(nid);
					if (nd && nd.selected) {
						nd.selected = false;
						$(field).removeClass('w2ui-selected').find('.w2ui-icon').removeClass('w2ui-icon-selected');
					}
				});
				$(this.box).find('#node_'+ w2utils.escapeId(id))
					.addClass('w2ui-selected')
					.find('.w2ui-icon').addClass('w2ui-icon-selected');
				nd.selected = true;
				this.selected = id;
				// bind up/down arrows
				if (this.keyboard) {
					if (typeof window.w2active != 'undefined') $(document).off('keydown', w2ui[window.w2active].doKeydown)
					$(document).on('keydown', this.doKeydown);
					window.w2active = this.name;
				} else {
					$(document).off('keydown', this.doKeydown);
				}
			}
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
		},
		
		doKeydown: function (event) {
			if (event.target && event.target.tagName != 'BODY') return;
			var obj = w2ui[window.w2active];
			var nd  = obj.get(obj.selected);
			// trigger event
			var eventData = obj.trigger({ phase: 'before', type: 'keyboard', target: obj.name, event: event });	
			if (eventData.stop === true) return false;
			// default behaviour
			var ind = obj.get(obj.selected, true);
			if (event.keyCode == 13) { // enter
				obj.toggle(obj.selected);
			}
			if (event.keyCode == 38) { // up
				if (ind > 0) { 
					var nd2 = nd.parent.nodes[ind-1];
					if (nd2.disabled) { if (event.preventDefault) event.preventDefault(); return; }
					obj.doClick(nd2.id, event); 
					//var tmp = $(obj.box).find('#node_'+ w2utils.escapeId(nd2.id));
					// if (tmp.length > 0) tmp[0].scrollIntoView(); // scrollIntoView is buggy
				}
				if (event.stopPropagation) event.stopPropagation();
				if (event.preventDefault) event.preventDefault();
			}
			if (event.keyCode == 40) { // down
				if (ind < nd.parent.nodes.length-1) { 
					var nd2 = nd.parent.nodes[ind+1];
					if (nd2.disabled) { if (event.preventDefault) event.preventDefault(); return; }
					obj.doClick(nd2.id, event); 
					//var tmp = $(obj.box).find('#node_'+ w2utils.escapeId(nd2.id));
					// if (tmp.length > 0) tmp[0].scrollIntoView(); // scrollIntoView is buggy
				}
				if (event.preventDefault) event.preventDefault();
				if (event.stopPropagation) event.stopPropagation();
			}
			// event after
			obj.trigger($.extend(eventData, { phase: 'after' }));
		},

		doDblClick: function (id, event) {
			if (window.getSelection) window.getSelection().removeAllRanges(); // clear selection 
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'dblClick', target: id, event: event });	
			if (eventData.stop === true) return false;
			// default action
			var nd = this.get(id);
			if (nd.nodes.length > 0) this.toggle(id);
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
		},
	
		doContextMenu: function (id, event) {
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'contextMenu', target: id, event: event });	
			if (eventData.stop === true) return false;
			
			// default action
			// -- no actions
			
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
		},
				
		render: function (box) {
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'render', target: this.name, box: box });	
			if (eventData.stop === true) return false;
			// default action
			if (typeof box != 'undefined' && box != null) { 
				if ($(this.box).find('> div > div.w2ui-sidebar-div').length > 0) {
					$(this.box)
						.removeAttr('name')
						.removeClass('w2ui-reset w2ui-sidebar')
						.html('');
				}
				this.box = box;
			}
			if (!this.box) return;
			$(this.box)
				.attr('name', this.name)
				.addClass('w2ui-reset w2ui-sidebar')
				.html('<div>'+
						'<div class="w2ui-sidebar-top"></div>' +
						'<div class="w2ui-sidebar-div"></div>'+
						'<div class="w2ui-sidebar-bottom"></div>'+
					'</div>'
				);
			$(this.box).find('> div').css({
				width 	: $(this.box).width() + 'px',
				height 	: $(this.box).height() + 'px'
			});
			if ($(this.box).length > 0) $(this.box)[0].style.cssText += this.style;
			// adjust top and bottom
			if (this.topHTML != '') {
				$(this.box).find('.w2ui-sidebar-top').html(this.topHTML);
				$(this.box).find('.w2ui-sidebar-div')					
					.css('top', $(this.box).find('.w2ui-sidebar-top').height() + 'px');
			}
			if (this.bottomHTML != '') {
				$(this.box).find('.w2ui-sidebar-bottom').html(this.bottomHTML);
				$(this.box).find('.w2ui-sidebar-div')
					.css('bottom', $(this.box).find('.w2ui-sidebar-bottom').height() + 'px');
			}
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
			// ---
			this.refresh();
		},
		
		refresh: function (id) {
			if (window.getSelection) window.getSelection().removeAllRanges(); // clear selection 
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'refresh', target: (typeof id != 'undefined' ? id : this.name) });	
			if (eventData.stop === true) return false;
			// adjust top and bottom
			if (this.topHTML != '') {
				$(this.box).find('.w2ui-sidebar-top').html(this.topHTML);
				$(this.box).find('.w2ui-sidebar-div')					
					.css('top', $(this.box).find('.w2ui-sidebar-top').height() + 'px');
			}
			if (this.bottomHTML != '') {
				$(this.box).find('.w2ui-sidebar-bottom').html(this.bottomHTML);
				$(this.box).find('.w2ui-sidebar-div')
					.css('bottom', $(this.box).find('.w2ui-sidebar-bottom').height() + 'px');
			}
			// default action
			$(this.box).find('> div').css({
				width 	: $(this.box).width() + 'px',
				height 	: $(this.box).height() + 'px'
			});
			var obj = this;
			if (typeof id == 'undefined') {
				var node = this;
				var nm 	 = '.w2ui-sidebar-div';
			} else {
				var node = this.get(id);
				if (node == null) return;
				var nm 	 = '#node_'+ w2utils.escapeId(node.id) + '_sub';
			}
			if (node != this) {
				var tmp = '#node_'+ w2utils.escapeId(node.id);
				var nodeHTML = getNodeHTML(node);
				$(this.box).find(tmp).before('<div id="sidebar_'+ this.name + '_tmp"></div>');
				$(this.box).find(tmp).remove();
				$(this.box).find(nm).remove();
				$('#sidebar_'+ this.name + '_tmp').before(nodeHTML);
				$('#sidebar_'+ this.name + '_tmp').remove();
			}
			// refresh sub nodes
			$(this.box).find(nm).html('');
			for (var i=0; i < node.nodes.length; i++) {
				var nodeHTML = getNodeHTML(node.nodes[i]);
				$(this.box).find(nm).append(nodeHTML);
				if (node.nodes[i].nodes.length != 0) { this.refresh(node.nodes[i].id); }
			}
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
			
			function getNodeHTML(nd) {
				var html = '';
				var img  = nd.img;
				if (img == null) img = this.img;
				var icon  = nd.icon;
				if (icon == null) icon = this.icon;
				// -- find out level
				var tmp   = nd.parent;
				var level = 0;
				while (tmp && tmp.parent != null) {
					if (tmp.group) level--;
					tmp = tmp.parent;
					level++;
				}	
				if (typeof nd.caption != 'undefined') nd.text = nd.caption;
				if (nd.group) {
					html = 
						'<div class="w2ui-node-group"  id="node_'+ nd.id +'"'+
						'		onclick="w2ui[\''+ obj.name +'\'].toggle(\''+ nd.id +'\'); '+
						'				 var sp=$(this).find(\'span:nth-child(1)\'); if (sp.html() == \''+ w2utils.lang('Hide') +'\') sp.html(\''+ w2utils.lang('Show') +'\'); else sp.html(\''+ w2utils.lang('Hide') +'\');"'+
						'		onmouseout="$(this).find(\'span:nth-child(1)\').css(\'color\', \'transparent\')" '+
						'		onmouseover="$(this).find(\'span:nth-child(1)\').css(\'color\', \'inherit\')">'+
						'	<span>'+ (!nd.hidden && nd.expanded ? w2utils.lang('Hide') : w2utils.lang('Show')) +'</span>'+
						'	<span>'+ nd.text +'</span>'+
						'</div>'+
						'<div class="w2ui-node-sub" id="node_'+ nd.id +'_sub" style="'+ nd.style +';'+ (!nd.hidden && nd.expanded ? '' : 'display: none;') +'"></div>';
				} else {
					if (nd.selected && !nd.disabled) obj.selected = nd.id;
					var tmp = '';
					if (img)  tmp = '<div class="w2ui-node-image w2ui-icon '+ img +	(nd.selected && !nd.disabled ? "w2ui-icon-selected" : "") +'"></div>';
					if (icon) tmp = '<div class="w2ui-node-image"><span class="'+ icon +'"></span></div>';
					html = 
					'<div class="w2ui-node '+ (nd.selected ? 'w2ui-selected' : '') +' '+ (nd.disabled ? 'w2ui-disabled' : '') +'" id="node_'+ nd.id +'" style="'+ (nd.hidden ? 'display: none;' : '') +'"'+
						'	ondblclick="w2ui[\''+ obj.name +'\'].doDblClick(\''+ nd.id +'\', event);"'+
						'	oncontextmenu="w2ui[\''+ obj.name +'\'].doContextMenu(\''+ nd.id +'\', event); '+
						'		if (event.preventDefault) event.preventDefault();"'+
						'	onClick="w2ui[\''+ obj.name +'\'].doClick(\''+ nd.id +'\', event); ">'+
						'<table cellpadding="0" cellspacing="0" style="margin-left:'+ (level*18) +'px; padding-right:'+ (level*18) +'px"><tr>'+
						'<td class="w2ui-node-dots" nowrap onclick="w2ui[\''+ obj.name +'\'].toggle(\''+ nd.id +'\'); '+
						'		if (event.stopPropagation) event.stopPropagation(); else event.cancelBubble = true;">'+ 
						'	<div class="w2ui-expand">'	+ (nd.nodes.length > 0 ? (nd.expanded ? '-' : '+') : (nd.plus ? '+' : '')) + '</div>' +
						'</td>'+
						'<td class="w2ui-node-data" nowrap>'+ 
							tmp +
							(nd.count !== '' ? '<div class="w2ui-node-count">'+ nd.count +'</div>' : '') +
							'<div class="w2ui-node-caption">'+ nd.text +'</div>'+
						'</td>'+
						'</tr></table>'+
					'</div>'+
					'<div class="w2ui-node-sub" id="node_'+ nd.id +'_sub" style="'+ nd.style +';'+ (!nd.hidden && nd.expanded ? '' : 'display: none;') +'"></div>';
				}
				return html;
			}
		},
	
		resize: function () {
			if (window.getSelection) window.getSelection().removeAllRanges(); // clear selection 
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'resize', target: this.name });
			if (eventData.stop === true) return false;
			// default action
			$(this.box).css('overflow', 'hidden');	// container should have no overflow
			//$(this.box).find('.w2ui-sidebar-div').css('overflow', 'hidden');
			$(this.box).find('> div').css({
				width 	: $(this.box).width() + 'px',
				height 	: $(this.box).height() + 'px'
			});			
			//$(this.box).find('.w2ui-sidebar-div').css('overflow', 'auto');
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));
		},
		
		destroy: function () { 
			// event before
			var eventData = this.trigger({ phase: 'before', type: 'destroy', target: this.name });	
			if (eventData.stop === true) return false;
			// remove events
			$(document).off('keydown', this.doKeydown);
			// clean up
			if ($(this.box).find('> div > div.w2ui-sidebar-div').length > 0) {
				$(this.box)
					.removeAttr('name')
					.removeClass('w2ui-reset w2ui-sidebar')
					.html('');
			}
			delete w2ui[this.name];
			// event after
			this.trigger($.extend(eventData, { phase: 'after' }));	
		}				
	}
	
	$.extend(w2sidebar.prototype, $.w2event);
	w2obj.sidebar = w2sidebar;
})();
