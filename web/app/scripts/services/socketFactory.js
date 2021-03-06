'use strict';
 
angular.module('webApp')

	
	.factory('SearchFollowFac',['socket','AuthFactory','$rootScope',function(socket,AuthFactory,$rootScope){

		var	SF={};

		SF.search =function(sname){
			    socket.emit('search',{userId:AuthFactory.getUserId(),
                      token:AuthFactory.getToken(),
                      name :sname });
		}

		socket.on('AuthorizationFailed',function(message){
        ngDialog.open({template:'\
                  <div class="ngdialog-message">\
                  <div><h3>Unauthorized</h3></div>',plain: 'true'});
    	});

		socket.on('searchresult',function(result){
         	$rootScope.$broadcast("SearchResult", result);
      		}); 

		SF.follow =function(him){
       		socket.emit('follow',{followerId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          followingId :him });

    	};
     	
     	SF.unFollow =function(him){
        	socket.emit('unfollow',{followerId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          followingId :him });
    	};

		return SF;

	}])


	.factory('PostBlogFac',['socket','AuthFactory','$rootScope', 'ngDialog',function(socket,AuthFactory,$rootScope,ngDialog){
		var PB ={};

		PB.post = function(title,body)
			{

				socket.emit('postblog',{ ownerId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          title :title,
                          body :body
        		});

        		

			}

			socket.on('replypost',function(message){
       			console.log(AuthFactory.getUsername()+"posted");
       			$rootScope.$broadcast("ReplyPost",message);

      		});




	    	
		return PB;

	}])

	.factory('PostGathFac',['socket','AuthFactory','$rootScope',function(socket,AuthFactory,$rootScope){
		var PG ={};


		PG.refreshPost =function(){
			socket.emit('gatherwebposts',{userId: AuthFactory.getUserId(),
           					token: AuthFactory.getToken() });
			}
			
	 		socket.on('gatheredwebpost',function(data){
	 		$rootScope.$broadcast("GatheredPost",data);
     		});

     		socket.on('gatheredNewpost',function(data){
	 		$rootScope.$broadcast("GatheredNewPost",data);
	 	});

     	return PG;

	}])

	.factory('LikeDislikeFac',['socket','AuthFactory',function(socket,AuthFactory){

		var LD={};

		LD.emitInterest =function(event,id,intrst){

			socket.emit(event,{userId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          postId:id,
                          interest:intrst });
		}

		return LD;
	}])

	.factory('CommentPostFac',['socket','AuthFactory','$rootScope',function(socket,AuthFactory,$rootScope){
		var CP={};

		CP.postComment =function(pid,commt){
			console.log(pid+commt);
			    socket.emit('NewComment',{userId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          postId:pid,
                          comment:commt });

		}

		 	socket.on('ReplyComment',function(newcmt){
         		$rootScope.$broadcast("CommentBlog",newcmt);
        		});
		return CP;
	}])


	.factory('ReportPostFac',['socket','AuthFactory','$rootScope',function(socket,AuthFactory,$rootScope){
		var RP={};

		RP.reportBlog =function(pid,reson ){

      			socket.emit('reportPost',{userId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          postId:pid,
                          reason:reson});

		}
			socket.on('ReplyReport',function(msg){
          			$rootScope.$broadcast("ReportBlog",msg);
        		});

		return RP;
	}])

	.factory('NotificationFac',['$rootScope','socket','AuthFactory','$localStorage',function($rootScope,socket,AuthFactory,$localStorage){

		var NA={};
		NA.gatherNotification=function(){
			socket.emit('OnlineNotification',{userId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken()
                           });
		}


			socket.on('ReplyNotification',function(data){
				console.log("notifcation: ",data);
				$rootScope.$broadcast("RNotificationResult",data);
			});

			socket.on('IdentifyUrself',function(data){
						socket.emit('IamClient',{userId:AuthFactory.getUserId(),
                          token:AuthFactory.getToken(),
                          update:true,
                          ontime:$localStorage.get('UB',0)
                           });
			});

		return NA;
	}])
;