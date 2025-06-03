ArcGIS.Arcade = {
	evaluate: function(feature, expression) {
		var value = '';
		// remove comments
		expression = expression.replace(/\/\/.*/g, '');
		expression = expression.replace(/\/\*[\s\S]*\*\//g, '');
		// find functions
		(expression.match(/[a-z][a-z0-9]*[ \t\r\n]*\(/ig) || []).forEach(function(match) {
			var func = 'ArcGIS.Arcade.' + match.toLowerCase();
			expression = expression.replace(new RegExp(match.replace('(', '\\('), 'g'), func);
		});
		// evaluate feature values
		(expression.match(/\$feature\.[a-z0-9_]+/ig) || []).forEach(function(match) {
			var field = match.replace(/\$feature\./i, '');
			var value = ArcGIS.featureLayerHelpers.getFieldValue(feature, field);
			expression = expression.replace(new RegExp(match.replace('$', '\\$'), 'g'), value);
		});
		// evaluate $view.scale
		expression = expression.replace(/\$view\.scale/ig, ArcGIS.getScale());
		// evaluate expression
		try {
			value = eval(expression);
		}
		catch(ex) {
			console.warn('Arcade exception', ex);
		}
		return value;
	},
	now: function() {
		return new Date();
	},
	datediff: function(date1, date2, units) {
		if (date1 instanceof Date) {
			date1 = date1.getTime();
		}
		if (date2 instanceof Date) {
			date2 = date2.getTime();
		}
		var diff = date1 - date2;
		switch (units) {
			case 'years':
				diff = diff / (1000*60*60*24*365);
				break;
			case 'months':
				diff = diff / (1000*60*60*24*30);
				break;
			case 'days':
				diff = diff / (1000*60*60*24);
				break;
			case 'hours':
				diff = diff / (1000*60*60);
				break;
			case 'minutes':
				diff = diff / (1000*60);
				break;
			case 'seconds':
				diff = diff / 1000;
				break;
		}
		return diff;
	},
	iif: function(condition, trueValue, falseValue) {
		return condition ? trueValue : falseValue;
	}
};
