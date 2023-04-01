from telnetlib import STATUS
from django.shortcuts import render,redirect
from django.shortcuts import render
from django.http import JsonResponse,HttpResponseRedirect,HttpResponse
from main_app.models import Userdata, Question, Time_Penalty
from django.contrib.auth import logout
from django.contrib.auth.decorators import login_required

import json
import requests
import base64	
import time
import blind_coding.settings as settings

MAX_ATTEMPTS = 250
TOKEN = "0330-4949-3939290-494203-393"

@login_required
def default(request):
	user_data = Userdata.objects.filter(user_id = request.user)[0]
	context = {
		'userdata': user_data, 
		'maxAttempts': MAX_ATTEMPTS
	}
	return render(request,'loggedIn.html', context = context)

def index(request):
	return render(request,'index.html')

def enter_token(request):
	return render(request, "enter_token.html", {"accessToken": TOKEN})

def verify_token(request):
	if request.method == "POST":
		req = json.loads(request.body.decode('utf-8'))
		token = req["secretToken"]
		if token == TOKEN:
			print("Token verified")
			res = {
				"msg": "success"
			}
			return HttpResponse(json.dumps(res))
		else:
			print("Invalid token")
			res = {
				"msg": "error"
			}
			return HttpResponse(json.dumps(res))
	else:
		return render(request, "verify.html")

def login(request):
	return redirect('/accounts/google/login')

@login_required(login_url='/')
def main(request):
	return render(request, 'loggedIn.html')

def question(request):
	data = json.loads( request.body.decode('utf-8') )
	num = data['queNum']
	ques = Question.objects.get(qno=num)
	question = ques.text
	sampleTestCaseNum = ques.testcaseno
	sampleIn = ques.samplein
	sampleOut = ques.sampleout
	
	res={}
	res['question'] = question
	res['qNo'] = num
	res['sampTCNum'] = sampleTestCaseNum
	res['sampIn'] = sampleIn
	res['sampleOut'] = sampleOut
	res['userScore'] = Userdata.objects.get(user_id = request.user).score

	return HttpResponse(json.dumps(res))

def runCode(request):
	postData = json.loads(request.body.decode('utf-8'))
	print(postData)

	email = postData["email"]
	
	que = Question.objects.get(qno=postData['qNo'])
	
	stdin = '6'+'\n'+que.test_case1+'\n'+que.test_case2+'\n'+que.test_case3+'\n'+que.test_case4+'\n'+que.test_case5+'\n'+que.test_case6
	
	req = {
		'clientId': '5830c3f45d22976c891ea609178123f3',
		'clientSecret': '576546edb3d80d4ae3e20557266b1a95af686462eb1d1a83131872e69755d285',
		'script': postData["source_code"],
		'stdin': stdin,
		'language': postData["language_id"],
		'versionIndex': postData["version"]
	}
	
	postData['stdin'] = stdin
	url = 'https://judge0-ce.p.rapidapi.com/submissions',

	response = requests.post(url , json=req)	
	resp = response.json()

	status = resp["statusCode"]
	output = resp["output"]

	print(resp)

	res = {}
	if status != 200:
		print("Server side or JDoodle error!!!")
		res["stdout"] = "A server-side error occured, please try again after some time...\n"
		return HttpResponse(json.dumps(res))
	print("JDoodle worked fine")

	currUser = Userdata.objects.get(user_id = request.user)
	currUser.user_id.email = email
	currUser.user_id.save()
	currUser.attempts -= 1
	currUser.save()

	print(currUser.user_id.email)

	if 'Timeout' in output:
		print("TLE")
		res["stdout"] = "Time Limit Exceeded"
		res['runAttempts'] = currUser.attempts
		res['score'] = currUser.score

		timepenalty , status = Time_Penalty.objects.get_or_create(player=currUser,question=que)
		timepenalty.no_wa+=1
		timepenalty.save()

		return HttpResponse(json.dumps(res))

	if ('error' in output) or ('Error' in output):
		res['stdout'] = 'Error: \n' + output.replace("jdoodle", "main")
		res['runAttempts'] = currUser.attempts
		res['score'] = currUser.score
	else:
		quesNo = postData['qNo']
		quesData = Question.objects.get(qno= quesNo)
		answer = quesData.test_case1_sol+'\n'+quesData.test_case2_sol+'\n'+quesData.test_case3_sol+'\n'+quesData.test_case4_sol+'\n'+quesData.test_case5_sol+'\n'+quesData.test_case6_sol+'\n'
		
		currUser.timeElapsed += int(postData['timeElapsed'])
		if answer == output:
			res['stdout'] = 'Accepted!'
			res['runAttempts'] = currUser.attempts
			lst = list(currUser.answerGiven)
			
			if(lst[quesNo] == '0'):	# if the question is being answered first time
				print('Updating score for question no', )
				lst[quesNo] = '1'
				currUser.answerGiven="".join(lst)
				timepenalty , status =Time_Penalty.objects.get_or_create(player=currUser,question=que)
				timepenalty.time_penalty=int(postData['timeElapsed'])+(0.2*timepenalty.no_wa*que.weight)
				currUser.score+=que.weight
				currUser.total_penalty+=timepenalty.time_penalty
				timepenalty.save()
				currUser.save()
		else:
			timepenalty , status = Time_Penalty.objects.get_or_create(player=currUser,question=que)
			timepenalty.no_wa+=1
			timepenalty.save()

			res['stdout'] = 'Wrong Answer'
			res['runAttempts'] = currUser.attempts
	
	currUser.save()
	res['score'] = currUser.score

	if currUser.answerGiven == "11111":
		res['completedGame'] = 'true'
	else:
		res['completedGame'] = 'false'

	return HttpResponse(json.dumps(res))

def executeCode(request):
	postData = json.loads(request.body.decode('utf-8'))
	print(postData)

	email = postData["email"]
	que = Question.objects.get(qno=postData['qNo'])

	stdin = '3' + '\n' + que.test_case1 + '\n' + que.test_case2 + '\n' + que.test_case3

	url = "https://judge0-ce.p.rapidapi.com/submissions"

	querystring = {"base64_encoded":"true","fields":"*"}
	payload = {
		"language_id": postData["language_id"],
		"source_code": postData["source_code"],
		"stdin": ""
	}
	headers = {
		"content-type": "application/json",
		"Content-Type": "application/json",
		"X-RapidAPI-Key": "9aba23fd27msh4f6a0d16b420c2bp11e1cfjsn5bcece972b58",
		"X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
	}

	response = requests.request("POST", url, json=payload, headers=headers, params=querystring)
	print(response.text)

	url = "https://judge0-ce.p.rapidapi.com/submissions/" + response.json()["token"]

	querystring = {"base64_encoded":"true","fields":"*"}

	headers = {
		"X-RapidAPI-Key": "9aba23fd27msh4f6a0d16b420c2bp11e1cfjsn5bcece972b58",
		"X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
	}

	response = requests.request("GET", url, headers=headers, params=querystring)

	print(response.text)
	res = response.json()
	return HttpResponse(json.dumps(res))

def l_out(request):
	logout(request)
	return render(request,'index.html')

def leaderboard(request):
	leaderboard = Userdata.objects.order_by('-score','total_penalty')
	print(leaderboard)
	username = []
	score = []
	for i in range(10):
		try:
			username.append(leaderboard[i].name)
			score.append(leaderboard[i].score)
		except:
			pass
	
	curr_user = Userdata.objects.get(user_id=request.user)
	curr_score = curr_user.score
	rank = 1
	for player in leaderboard:
		if curr_user == player:
			break
		if curr_score <= player.score:
			rank += 1

	resp = {'username': username, 'score': score, 'rank': rank}
	return HttpResponse(json.dumps(resp), content_type='application/json')

def getChancesUsed(request):
	res={}
	res['chancesUsed'] = Userdata.objects.get(user_id = request.user).chancesUsed
	return HttpResponse(json.dumps(res))

def increaseClicks(request):
	data = json.loads( request.body.decode('utf-8') )
	clicks = data['clicks']
	user = Userdata.objects.get(user_id = request.user)
	user.chancesUsed = clicks
	user.save()
	res = {}
	res['error'] = 'No Error'
	return HttpResponse(json.dumps(res))
