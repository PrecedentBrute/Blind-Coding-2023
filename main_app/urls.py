from django.contrib import admin
from django.urls import path,include,re_path
from . import views

app_name='quiz'

urlpatterns=[
     path('main/', views.default, name='main'),
     path('', views.index, name='index'),
     path('verify/', views.verify_token, name='verify'),
     path('tanveer/', views.enter_token, name='enter_token'),
     path('login/', views.login, name='login'),
     path('logout/', views.l_out, name='logout'),
     path('question/', views.question, name='question'),
     path('runCode/', views.executeCode, name='runCode'),
     path('leaderboard/', views.leaderboard, name='leaderboard'),
     path('getChancesUsed/', views.getChancesUsed, name='getChancesUsed'),
     path('increaseClicks/', views.increaseClicks, name='increaseClicks'),     
]
