const knex =require('../knex');
const uuidv4 = require('uuid/v4');
var mailController =require('./mailController');
var loadController =require('./loadController');

exports.searchFor=function(followerId,name,callback){
	var searchResult ={};
	var user ={};
	var index =0;
	if(name=='')
		return callback(searchResult);
	
	knex.column('userId', 'email', 'name').select().from('bloggingUsers')
		.where('name', 'ilike', '%'+name+'%')
		.andWhereNot('userId',followerId)
		.orWhere('email','ilike','%'+name+'%')
		.andWhereNot('userId',followerId)
		.then(function(row){
			if(row.length==0)
				return callback(searchResult);
			row.forEach(function(record){
				
				knex('followingLink')
					.count('followingId')
					.where({'followerId':followerId,'followingId':record.userId})
					.then(function(follow){
						user.userId =record.userId;
						user.email =record.email;
						user.name =record.name;
						user.follow =parseInt(follow[0].count);
						searchResult[index++]=user;
						user={};
						if(Object.keys(searchResult).length==row.length)
						{
							return callback(searchResult);
						}
				})
				.catch(function(){
					console.log("activityController.searchFor : Database Error in FollowingLink");
				});
		});

	})
	.catch(function(){
		console.log("activityController.searchFor : Database Error in bloggingUsers");
	}); 
		//end of select
}

exports.followHim =function(fId,fgId){

	knex('followingLink').insert({followerId: fId,
									followingId:fgId})
		.then(function(){
			console.log("From : activityController.followHim :New link inserted");
		});

}

exports.unfollowHim =function(fId,fgId){
	knex('followingLink')
		.where({'followerId': fId,
				'followingId':fgId	})
		.del()
		.then(function(check){
			console.log("From : activityController.unfollowHim :link removed");
		});
}

exports.postblogs =function(oId,tle,bdy,callback){
	//console.log("From : activityController.postblogs :",oId,tle,bdy);
	knex('blogPost').insert({'postId': uuidv4(),
							'ownerId':oId,
							'title':tle,
							'body':bdy,
							'noLikes':0,
							'noDislikes':0})

		.then(function(response){
				knex('blogPost')
					.join('bloggingUsers', 'blogPost.ownerId', '=', 'bloggingUsers.userId')
					.select('blogPost.postId', 'blogPost.ownerId', 'bloggingUsers.name','bloggingUsers.username', 'blogPost.title','blogPost.body','blogPost.noLikes','blogPost.noDislikes','blogPost.createdAt','blogPost.slno')
					.where('ownerId',oId)
					.andWhere('title',tle)
					.then(function(row){
						post={};
						post=row[0];
						post.comments=[];
						post.interest=2;
						console.log("From : activityController.postblogs :Post inserted and sent the response");
						return callback({'message':"Posted Successfully",'blog':post});
					})
					.catch(function(){
						console.log("From : activityController.postblogs :DB error bloggingUsers");
					});
			console.log("From : activityController.postblogs :New post inserted");

			
		})
		.catch(function(){
			console.log("From : activityController.postblogs :New post inserted failed");
			return callback({'message':"Posted unSuccessfully"});
		});		

}





postgathering =function(user,callback){ // function to get all required post for the authenicated user
	var allposts =[];
	knex('followingLink')
		.where('followerId',user)
		.then(function(followinguser){  // all followers of user
			followinguser.forEach(function(fuser,indexf){

				knex('blogPost')
					.join('bloggingUsers', 'blogPost.ownerId', '=', 'bloggingUsers.userId')
					.select('blogPost.postId', 'blogPost.ownerId', 'bloggingUsers.name','bloggingUsers.username', 'blogPost.title','blogPost.body','blogPost.noLikes','blogPost.noDislikes','blogPost.createdAt','blogPost.slno')
					.where('ownerId',fuser.followingId)
					.orderBy('blogPost.slno', 'desc')
					.limit(1)
					.then(function(posts){
							//console.log('checking the posts',posts);
							allposts=allposts.concat(posts);	 // posts are joined for the user to display
							//console.log('in stage',allposts);
						if(followinguser.length-1==indexf) // return when all post are gathered
							{ return callback(false,allposts); }
					})
					.catch(function(){
						return callback(true,null);
					});
			});
		})
		.catch(function(){
			return callback(true,null); // callback(error,allposts)
		});
}


exports.postpacking =function(user,callback){ // function to append all details to the post gathered
	finalPosts=[];
	var index=0;
	postgathering(user,function(error,allPost){
		//console.log('in okay stage',allPost);
		if(error)
			return callback(true,null);
		if(allPost.length==0)
			callback(false,{})
	allPost
	.sort(function(a, b){return b.slno - a.slno;})
	.slice(0, 5)
	.forEach(function(post){
			knex('postComment')
				.join('bloggingUsers', 'postComment.cmtById', '=', 'bloggingUsers.userId')
				.select('bloggingUsers.username', 'postComment.comment','postComment.createdAt')
				.where('postComment.cmtOfId',post.postId)
				.orderBy('postComment.createdAt', 'desc')
				.then(function(comments){
					post.comments =comments;

					knex('postInterest')
						.select('interest')
						.where({'intOfId':post.postId,'intById':user})
						.then(function(record){
							if(record.length==1)
							{
								post.interest=record[0].interest;
							}
							else
								post.interest=2;
							console.log('activityController.postpacking: post sent');
							callback(false,post);

							/*if(finalPosts.length==allPost.length)
								return callback(false,finalPosts); */
						})
						.catch(function(){
							console.log('activityController.postpacking: Db error postInterest');
							return callback(true,null);
						}); // end of select interests

				})
				.catch(function(){
					console.log('activityController.postpacking: Db error postComment');
					return callback(true,null);
				}); // end of select comments

		}); // end of allPost.forEach
	});
}


exports.deleteInterest=function(uId,pId,interest){
	knex('postInterest')
		.where({'intOfId':pId,'intById':uId})
		.del()
		.then(function(){
			if(interest==1){
			knex('blogPost')
				.where('postId',pId)
				.decrement('noLikes', 1)
				.then(function(){

				});
			}
			else{
			knex('blogPost')
				.where('postId',pId)
				.decrement('noDislikes', 1)
				.then(function(){

				});
			}
		});

}

exports.insertInterest =function(uId,pId,interest){
	
	knex('postInterest')
			.insert({intOfId:pId,
					intById:uId,
					interest:interest})
			.then(function(){
		if(interest==1){
			knex('blogPost')
				.where('postId',pId)
				.increment('noLikes', 1)
				.then(function(){
					mailController.sendMail(pId,uId,"Liked");
				});
			}
			else{
			knex('blogPost')
				.where('postId',pId)
				.increment('noDislikes', 1)
				.then(function(){
					mailController.sendMail(pId,uId,"Disiked");
				});
			}
				});

}

exports.updateInterest=function(uId,pId,interest){

	knex('postInterest')
		.where({'intOfId':pId,'intById':uId})
		.update({
  				interest:interest
  				})
		.then(function(){
		if(interest==1){
			knex('blogPost')
				.where('postId',pId)
				.increment('noLikes', 1)
				.then(function(){
						knex('blogPost')
							.where('postId',pId)
							.decrement('noDislikes', 1)
							.then(function(){
								mailController.sendMail(pId,uId,"Liked");
							});

				});

			}
			else{
			knex('blogPost')
				.where('postId',pId)
				.decrement('noLikes', 1)
				.then(function(){
					knex('blogPost')
						.where('postId',pId)
						.increment('noDislikes', 1)
						.then(function(){
							mailController.sendMail(pId,uId,"DisLiked");
						});
				});
			}
		});

}


exports.insertComment=function(uId,pId,cmt,callback){
		knex('postComment')
			.insert({cmtOfId:pId,
					cmtById:uId,
					comment:cmt})
			.then(function(){
					console.log("From : activityController.insertComment :New comments inserted");
					return callback("Comment submitted")
				})
			.catch(function(){
				console.log("From : activityController.insertComment :New comments inserted failed");
				return callback("Comment Not submitted")
			});
}


exports.reportPost=function(uId,pId,rson,callback){
	console.log(uId+pId+rson);
		knex('reportedIssue')
			.insert({byUserId:uId,
					ofPostId:pId,
					reason:rson})
			.then(function(){
					console.log("From : activityController.reportPost :New report issued");
					return callback("Report Submitted")
				})
			.catch(function(){
				return callback("Report Not submitted")
			});
}

exports.realTimeNotification =function(userId,slno,updateNow,callback){

if(updateNow)
	loadController.postpackingBefore(userId,slno,function(err,newpost){
		callback(true,null,newpost);
	})

console.log("i am :",userId);
		knex('followingLink')
			.where('followerId',userId)
			.then(function(followers){ 
				followers.forEach(function(follower,indexfollower){
					console.log('From activityController.realTimeNotification :followers :',follower.followingId);
					knex('blogPost')
						.join('bloggingUsers', 'blogPost.ownerId', '=', 'bloggingUsers.userId')
						.select('bloggingUsers.name','blogPost.title','blogPost.createdAt','blogPost.slno')
						.where('ownerId',follower.followingId)
						.andWhere('blogPost.slno', '>',slno) // all post by a follower
							.then(function(posts){
								//activityCollection1=[];
								posts.forEach(function(post,indexpost){
									actmsg={};
									actmsg.byUser=post.name;
									actmsg.action="posted a blog :"
									actmsg.title=post.title;
									actmsg.onDate=post.createdAt;
									//console.log('stage 2',actmsg);  // logical error tracking 
									callback(false,actmsg,null);
									/*if(posts.length-1==indexpost)
										callback(activityCollection1);*/
								}); //end of for each posts 
							}) // end of select post by a follower
							.catch(function(){
								console.log('From activityController.realTimeNotification :Database Error in blogPost');
							});
						}); // end of for each follower
				})  // end of select all followers
				.catch(function(){
					console.log('From activityController.realTimeNotification:Database Error in followingLink');
				}); 
}