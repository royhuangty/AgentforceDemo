var app = angular.module("SkillsSelectorApp", ['ui.bootstrap',"pageslide-directive","infinite-scroll"]);
app.controller('skillSelectorController', function($scope,$filter,$timeout) {
    $scope.dtFinish = {};
    $scope.dtStart = {};
    $scope.mode = 'working';
	//$scope.categories = categories;
    $scope.isTimePhasedEnabled = isTimePhasedEnabled;
	$scope.skills = allSkills;
	//$scope.fieldsMap = fieldsNameToFieldsLabelMap;
	$scope.selectedPick = {};
    $scope.resSkillPhases = {};
    $scope.errorMsg = '';
    $scope.stationTz = moment().utcOffset();
    $scope.endIndex = 100;
    $scope.increaseFactor = 100;
    $scope.maxSkillLevelAllowed = 99;
    $scope.selectedId = '';
    $scope.skillName = '';
    $scope.dictionarySkillIdToName = {};
    $scope.begOfTimeLabel = customLabels.Beginning_Of_Time;
    $scope.endOfTimeLabel = customLabels.End_Of_Time;
    $scope.searchSkillsLabel = customLabels.Search_Skills;

    $scope.setLocale = function() {
        var newLocale = userLocale;
        try {
            if(userLocale.indexOf('iw') != -1) {
                newLocale = userLocale.replace("iw","he");
            } else if(userLocale.indexOf('in') != -1) {
                newLocale = userLocale.replace("in","id");
            } else if(userLocale.indexOf('ji') != -1) {
                newLocale = userLocale.replace("ji","yi");
            } 

            return moment.locale(newLocale);
        }catch(e) {
            return moment.locale();
        }
    };

    $scope.locale = $scope.setLocale();
    $scope.options = '{locale:"' + $scope.locale +'"}';
    $scope.isOnResSkillPage = currentPage.indexOf('ServiceResourceSkill') >= 0 ? true : false;
    
/*	for (cat in $scope.categories) {
		$scope.categories[cat].unshift(customLabels.All);
		$scope.selectedPick[cat] = customLabels.All;
	}*/
    $scope.checked = {};
    $scope.disabled = {};
    $scope.skills = JSON.parse($scope.skills);
    $scope.skills.forEach(function(skillObj) {
        $scope.dictionarySkillIdToName[skillObj.sobj.Id] = skillObj.sobj.MasterLabel;
        $scope.resSkillPhases[skillObj.sobj.Id] = {};
        $scope.resSkillPhases[skillObj.sobj.Id]['skillName'] = skillObj.sobj.MasterLabel;
        $scope.resSkillPhases[skillObj.sobj.Id]['phases'] = [];
        $scope.resSkillPhases[skillObj.sobj.Id]['phased'] = true;

        $scope.checked[skillObj.sobj.Id] = false; 
        $scope.disabled[skillObj.sobj.Id] = false;

        if(skillObj.rsObj.length == 0) {
            $scope.resSkillPhases[skillObj.sobj.Id]['phases'].push({'startOpen':false,'finishOpen':false, 'start': null ,'finish': null , 'level': skillObj.skillLevel});
            $scope.resSkillPhases[skillObj.sobj.Id]['phased'] = false;
        }

        skillObj.rsObj.forEach(function(rsObj) {

            var skillphase = {};
            skillphase['startOpen'] = false;
            skillphase['finishOpen'] = false;

            if( !rsObj.effectiveStart && !rsObj.effectiveFinish ) {
                $scope.resSkillPhases[skillObj.sobj.Id]['phased'] = false;
            }
 
            skillphase['start'] = rsObj.effectiveStart != null ? moment(rsObj.effectiveStart).add(moment.tz(rsObj.effectiveStart,rsObj.tz).utcOffset() - moment(rsObj.effectiveStart).utcOffset() ,'minute') : rsObj.effectiveStart;
            skillphase['finish'] = rsObj.effectiveFinish != null ? moment(rsObj.effectiveFinish).add(moment.tz(rsObj.effectiveFinish,rsObj.tz).utcOffset() - moment(rsObj.effectiveFinish).utcOffset(),'minute') : rsObj.effectiveFinish;
            skillphase['level'] = rsObj['skillLevel'];
            skillphase['levelOldVal'] = rsObj['skillLevel'];
            $scope.resSkillPhases[skillObj.sobj.Id]['phases'].push(skillphase);
        });
    });
    
	$scope.operator = 'and';
	$scope.searchTerm = '';
	$scope.selectedAll = false;
	$scope.selectedOnTop = true;
	$scope.predicate = '-isSelected';
    
    $scope.increaseLimit = function() {
        if($scope.endIndex < $scope.skills.length ) {
            $scope.endIndex += $scope.increaseFactor;
        }
    };

    $scope.toggle = function(id){
        $scope.selectedId = $scope.selectedId == id ? null : id;
        $scope.skillName = $scope.selectedId != null ? $scope.resSkillPhases[id].skillName : null;

        for (var property in $scope.checked) {
            if(property === id) {
                $scope.checked[property] = !$scope.checked[property];
            }
        }

        for (var property in $scope.disabled) {
            if(property !== id) {
                $scope.disabled[property] = !$scope.disabled[property];
            }
        }
    };

    $scope.removeRow = function(event,index) {
        var id = $scope.selectedId;

        if($scope.resSkillPhases[id]['phases'].length == 1) {
            $scope.resSkillPhases[id]['phased'] = false;
            $scope.resSkillPhases[id]['phases'][0]['start'] = null;//new Date();
            $scope.resSkillPhases[id]['phases'][0]['finish'] = null;//new Date();
            $scope.toggle(id);
        } else {
            $scope.resSkillPhases[id]['phases'].splice(index,1);
        }
        event.preventDefault();
    };

	$scope.selectAllOrNone = function() {
        if (!$scope.selectedAll) {
            $scope.selectedAll = true;
        }
        else {
            $scope.selectedAll = false;
        }
        angular.forEach($scope.filteredSkills, function (item) {
            item.isSelected = $scope.selectedAll;
            if( !item.isSelected && $scope.checked[item.sobj.Id] ) {
                $scope.toggle(item.sobj.Id);
            }
        });
	};

    $scope.closeConnectedPhasePage = function(id) {
        if( this.$parent.checked[id] ) {
            this.$parent.toggle(id);
        }
    };

    $scope.isEmpty = function(o) {
        return Object.keys(o).length;
    }

    $scope.checkValidity = function(resSkillObj) {
        try{
            if( resSkillObj.level % 1 != 0 )  {
                resSkillObj.level = resSkillObj.levelOldVal;
                throw customLabels.Only_Whole_Numbers;
            }
            if( resSkillObj.level > $scope.maxSkillLevelAllowed )  {
                resSkillObj.level = resSkillObj.levelOldVal;
                throw customLabels.Number_Is_Above_Limit;
            }
            resSkillObj.levelOldVal = resSkillObj.level;
            $scope.errorMsg = '';
            $scope.mode = 'working';
        } catch(skillExc) {
            $scope.errorMsg = skillExc;
            $scope.mode = 'updateError';
        }
    };

    function isIntersect(a_start, a_end, b_start, b_end) {
        return (a_start < b_end && a_end > b_start);
    }

    function isSkillPhasesIntersect(skillObj) {

        if (skillObj.phases.length <= 1) {
            return false;
        }

        for (let i=0; i<skillObj.phases.length; i++) {

            let mainDate = skillObj.phases[i];

            for (let j=0; j<skillObj.phases.length; j++) {

                if (i === j) {
                    continue;
                }

                let secondDate = skillObj.phases[j];

                let phase1start = mainDate.start ? mainDate.start._d : new Date(2000,1,1),
                    phase1finish = mainDate.finish ? mainDate.finish._d : new Date(3500,1,1),
                    phase2start = secondDate.start ? secondDate.start._d : new Date(2000,1,1),
                    phase2finish = secondDate.finish ? secondDate.finish._d : new Date(3500,1,1);

                if (isIntersect(phase1start, phase1finish, phase2start, phase2finish)) {
                    return true;
                }

            }

        }

        return false;
    }


    function isSkillDatesAreBad(skillObj) {

        for (let i=0; i<skillObj.phases.length; i++) {

            let phase1start = skillObj.phases[i].start ? skillObj.phases[i].start._d : new Date(2000,1,1),
                phase1finish = skillObj.phases[i].finish ? skillObj.phases[i].finish._d : new Date(3500,1,1);

            if (phase1start >= phase1finish) {
                return true;
            }
        }

        return false;

    }



	$scope.saveSkills = function(){
        if ($scope.skillForm.$invalid) {
            let skillLevelMessage = customLabels.Invalid_Skill_Level;
            alert(skillLevelMessage);
            return;
        }

        // check for start > finish
        for (let id in $scope.resSkillPhases) {
            if (isSkillDatesAreBad($scope.resSkillPhases[id])) {
                let phaseMessage = customLabels.Skill_Phase_Start_After_Finish.replace('$',$scope.resSkillPhases[id].skillName);
                alert(phaseMessage);
                return;
            }
        }

        // check for intersection
        for (let id in $scope.resSkillPhases) {
            if (isSkillPhasesIntersect($scope.resSkillPhases[id])) {
                let intersectingSkillsMessage = customLabels.Skill_Phase_Intersecting_Dates.replace('$', $scope.resSkillPhases[id].skillName);
                alert(intersectingSkillsMessage);
                return;
            }
        }



        $timeout(function() {
    		$scope.mode = 'saving';
            try {
                $scope.skills.forEach(function(skillObj) {
                    var newRsList = [];

                    if( $scope.resSkillPhases[skillObj.sobj.Id]['phases'].length >= 1 ) {
                        if($scope.resSkillPhases[skillObj.sobj.Id]['phases'][0]['start'] != null ||
                           $scope.resSkillPhases[skillObj.sobj.Id]['phases'][0]['finish'] != null ) {
                                $scope.resSkillPhases[skillObj.sobj.Id]['phased'] = true;
                        }
                    } 
                    try {
                        $scope.resSkillPhases[skillObj.sobj.Id]['phases'].forEach(function(rsObj) {
                            var newRsObj = {};
                            var startDate = null;
                            var finishDate = null;
                            var skillLevel = rsObj['level'];
                            
                            startDate = rsObj['start'] != null ? rsObj['start'].clone() : null;
                            finishDate = rsObj['finish'] != null ? rsObj['finish'].clone() : null;

                            if( startDate && $scope.resSkillPhases[skillObj.sobj.Id]['phased'] )
                                newRsObj.effectiveStart = startDate.add(startDate.utcOffset() ,'minute');

                            if( finishDate && $scope.resSkillPhases[skillObj.sobj.Id]['phased'] )
                                newRsObj.effectiveFinish = finishDate.add(finishDate.utcOffset() ,'minute');

                            // if( skillLevel % 1 != 0 )  {
                            //     if( skillObj.isSelected ) {
                            //         throw customLabels.Only_Whole_Numbers;
                            //     } else {
                            //         skillLevel = 0;
                            //     }
                            // } 
                            // else if (!angular.isNumber(rsObj.level)) {
                            //     throw 'has one or more skill levels configured to invalid numbers, skill level can be only whole positive numbers';
                            // } else if (rsObj.level <= 0) {
                            //     throw 'has one or more skill levels configured to be non-positive numbers, skill level can be only whole positive numbers';
                            // }

                            newRsObj.skillLevel = skillLevel;
                            newRsList.push(newRsObj);
                        });

                        skillObj.rsObj = newRsList;
                    } catch (resSkillExc) {
                        var excMsg = customLabels.skill + ' ' + skillObj.sobj.MasterLabel + ' ' + resSkillExc;
                        throw excMsg;
                    }
                });
            } catch(skillExc) {
                $scope.errorMsg = skillExc;
                $scope.safeApply(function() {
                    $scope.mode = 'error';
                });
                return;
            }

    	    Visualforce.remoting.Manager.invokeAction(
    	    		RemoteActions.saveSkills,
    	    		JSON.stringify($scope.skills),stdCtrlSObject,skillSObject,junctionObject,myId,relationshipField,
    	    		function(skillResults,event){
                        if( event && event.type == 'exception' ) {
                            var exceptionObj = JSON.parse(event.message);
                            if( exceptionObj.causingObjId ) {
                                $scope.errorMsg = customLabels.Error_Occurred_On_Skill + ' ' + $scope.dictionarySkillIdToName[exceptionObj.causingObjId] + ' - ' + exceptionObj.msg;
                            } else {
                                $scope.errorMsg = exceptionObj.msg;
                            }
                            
                            $scope.safeApply(function() {
                                $scope.mode = 'error';
                            });
                        }
    	    			else if(event){
    	    				$scope.safeApply(function() {
    	    					//$scope.skills = skillResults;
                                $scope.mode = 'done';

                                $scope.skills.forEach(function(skillObj) {
                                    if( $scope.resSkillPhases[skillObj.sobj.Id]['phases'].length >= 1 ) {
                                        $scope.resSkillPhases[skillObj.sobj.Id]['phases'].sort(function(resSkillA,resSkillB) {
                                            var res = 1;

                                            if ( resSkillA.start == null || resSkillB.start == null ) {
                                                res = resSkillA.start == null ? -1 : 1;
                                            }
                                            else if ( resSkillA.start.isBefore(resSkillB.start) ) { 
                                                res = -1;
                                            }

                                            return res;
                                        });
                                    } 
                                });

                                $timeout(function() {
                                    $scope.mode = 'working';
                                    // window.parent.location = '/' + myId;
                                }, 600);
    	    		        });

    	    			}

    	    		},{ buffer: false, escape: true, timeout: 120000  }

    	    );
        }, 0);
	 };

    $scope.getTitle = function(id) {
        if( $scope.disabled[id] ) {
            return '';
        }else if( $scope.checked[id] ) {
            return customLabels.Click_To_Close;
        } else {
            if( $scope.resSkillPhases[id]['phased'] == true ) {
                return customLabels.Click_To_Edit;
            } else {
                return customLabels.Click_To_Configure;    
            }
        }
    };

	$scope.safeApply = function(fn) {
		var phase = this.$root.$$phase;
		if(phase == '$apply' || phase == '$digest') {
			if(fn && (typeof(fn) === 'function')) {
		  		fn();
			}
		} 
		else {
			this.$apply(fn);
		}
	};

    $scope.initLimit = function() {
        $scope.endIndex = 100;
    }

    $scope.addPhase = function(event) {
        var id = $scope.selectedId;
        var resSkillObj = {};
        var lastIndex = $scope.resSkillPhases[id].phases.length - 1;
        var lastFinishDate = $scope.resSkillPhases[id]['phases'][lastIndex].finish;

        resSkillObj.startOpen = false;
        resSkillObj.finishOpen = false;
        if( lastFinishDate !== null ) {
            resSkillObj.start = new moment(lastFinishDate);
            resSkillObj.start = resSkillObj.start.startOf('day').add(1,'days');
        } else {
            resSkillObj.start = new moment();
            resSkillObj.start = resSkillObj.start.startOf('day');
        }
        
        resSkillObj.finish = new moment(resSkillObj.start);
        resSkillObj.finish = resSkillObj.finish.add(1,'days');
        resSkillObj.level = 1;

        $scope.resSkillPhases[id].phases.push(resSkillObj);
        $scope.resSkillPhases[id].phased = true;
        event.preventDefault();
    };

	$scope.order = function() {
		if (!$scope.selectedOnTop)
        	$scope.predicate = '-isSelected';
        else
        	$scope.predicate = 'sobj.MasterLabel';
    };

     $scope.openCalendar = function(e, id, index, flag) {
        if( flag === "start")
            (($scope.resSkillPhases[id].phases)[index]).startOpen = true;
        else {
            (($scope.resSkillPhases[id].phases)[index]).finishOpen = true;
        }
    };
	
});

app.filter('filterByCategory', function($filter) {
  return function(input, term, selectedPick, operator) {

    var filtered = [], showSkill;
    
    angular.forEach(input, function(skill) {
     	showSkill = true;
        
        /*for (cat in selectedPick) {
    		if (selectedPick[cat] == '') 
    			continue;
    		if (skill.sobj[fieldsNameToFieldsLabelMap[cat]] == null)
    			showSkill = false;

    		//found any? show skill
    		if (skill.sobj[fieldsNameToFieldsLabelMap[cat]] == selectedPick[cat] || selectedPick[cat] == customLabels.All) {
    			showSkill = true;

    			if (operator == 'or')
    				break;
    		}
    		else {
				showSkill = false;
    			
    			//not found once? don't show
    			if (operator == 'and') {
    				break;
    			}
    		}
    	}*/

    	if (showSkill && term) {
	        currentSkill = skill.sobj['MasterLabel'].toLowerCase();
        	var index = currentSkill.indexOf(term.toLowerCase());
    		
    		if (index >= 0)
    			showSkill = true;
    		else if (index < 0)
    			showSkill = false;
    	} 

      	if (showSkill) {
        	this.push(skill);
     	}

    }, filtered);
    return filtered;
  };
});