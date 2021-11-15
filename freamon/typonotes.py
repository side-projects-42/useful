import os
import cgi
import uuid
import time
import datetime
import urllib
import wsgiref.handlers
import simplejson

from google.appengine.dist import use_library
use_library('django', '1.2')
from google.appengine.ext import db
from google.appengine.api import users
from google.appengine.ext import webapp
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import channel

from GqlEncoder import GqlEncoder
from Cookies import Cookies

from apiclient.discovery import build
import httplib2
#from oauth2client.appengine import OAuth2Decorator
import settings

class PermissionError(Exception):
  pass
  
class LatencyError(Exception):
  pass

class Visitor(db.Model):
  id = db.IntegerProperty()
  name = db.StringProperty()
  date = db.DateTimeProperty(auto_now_add=True)
  trial = db.FloatProperty()
  cookie_id = db.StringProperty()
  google_id = db.StringProperty()
  
class Wall(db.Model):
  name = db.StringProperty()
  date = db.DateTimeProperty(auto_now_add=True)
  timestamp = db.IntegerProperty()
  
class Channel(db.Model):
  client_id = db.StringProperty()
  timestamp = db.IntegerProperty()
  viewing = db.ListProperty(int)
  
class Setting(db.Model):
  view = db.BooleanProperty()
  edit = db.BooleanProperty()
  
class Note(db.Expando):
  id = db.IntegerProperty()
  creator = db.IntegerProperty()
  date = db.DateTimeProperty(auto_now_add=True)
  timestamp = db.IntegerProperty()
  counter = db.IntegerProperty()
  text = db.StringProperty()
  scale = db.FloatProperty()
  x = db.IntegerProperty()
  y = db.IntegerProperty()
  z = db.IntegerProperty()
  color = db.IntegerProperty()
  font = db.IntegerProperty()
  taskID = db.StringProperty()
  taskCompleted = db.BooleanProperty()
  
class Preference(db.Model):
  snap = db.BooleanProperty()
  hover = db.BooleanProperty()
  footer = db.BooleanProperty()
  grid = db.BooleanProperty()
  
# Not working yet -> keys_only
class Fetcher():

  request = None
  visitor = None
  wall = None
  settings = None
  preferences = None

  def __init__(self, requesthandler):
    self.request = requesthandler
    
  def get_visitor(self,keys_only=False):
    # try to get by google account
    google_account = users.get_current_user()
    
    visitor = None
    if google_account:
      google_id = google_account.user_id()
      visitor = Visitor.all(keys_only=keys_only).filter('google_id =',google_id).get()

    if not visitor:
      cookies = Cookies(request,max_age=60*60*24*10)
      try:
        cookie_id = cookies['visitor']
        trial = cookies['trial']
        
      except KeyError:
        cookie_id = uuid.uuid4().hex
        trial = time.time() + 60*60*24*10
        cookies['visitor'] = cookie_id
        cookies['trial'] = str(trial)
      
      visitor = Visitor.all(keys_only=keys_only).filter('cookie_id =',cookie_id).get()
      
      # create 10 day account
      if not visitor:
        visitor = Visitor()
        visitor.cookie_id = cookie_id
        visitor.trial = float(trial)
        visitor.put()
      
      # update account (first login)
      try:
        visitor.google_id = google_id
        visitor.put()
      except UnboundLocalError:
        pass
  
    self.visitor = visitor
    
  def get_wall(self, wall_name, keys_only=False):
  
    if not self.visitor:
      self.get_visitor(keys_only)
      
    visitor_key = self.visitor.key()
    wall = Wall.all(keys_only=keys_only).filter('name =',wall_name).get()
    if not wall:
      wall = Wall(parent=visitor_key)
      wall.name = wall_name
      wall.view = True
      wall.edit = False
      key = wall.put()
      
      if keys_only:
        wall = key
      
    self.wall = wall
  
  def get_settings(self, keys_only=False):
  
    if not self.wall:
      self.get_wall(keys_only)
    
    wall_key = self.wall.key()
    setting = Setting.all(keys_only=keys_only).ancestor(wall_key).get()
    
    if not setting:
      setting = Setting(parent=wall_key)
      setting.view = True
      setting.edit = False
      key = setting.put()
      
      if keys_only:
        setting = key
      
    self.settings = setting 
  
  def get_preferences(self, keys_only=False):
  
    if not self.visitor:
      self.get_visitor(keys_only)
  
    visitor_key = self.visitor.key()
    preference = Preference.all(keys_only=keys_only).ancestor(visitor_key).get()
  
    if not preference:
      preference = Preference(parent=visitor_key)
      preference.snap = False
      preference.hover = False
      preference.footer = False
      preference.put()
      
      if keys_only:
        preference = key
    
    self.preferences = preference
  
def load_data(self):
  return simplejson.loads(self.request.get('data'))

def send_data(self,data):
  # Already JSON?
  if not type(data) is str:
    data = simplejson.dumps(data) 
  self.response.headers['Content-Type'] = 'application/json; charset=utf-8'
  self.response.out.write(data)   
  
def fetch_visitor(self,keys_only=False):
  # try to get by google account
  google_account = users.get_current_user()
  
  visitor = None
  if google_account:
    google_id = google_account.user_id()
    visitor = Visitor.all(keys_only=keys_only).filter('google_id =',google_id).get()

  if not visitor:
    cookies = Cookies(self,max_age=60*60*24*10)
    try:
      cookie_id = cookies['visitor']
      trial = cookies['trial']
      
    except KeyError:
      cookie_id = uuid.uuid4().hex
      trial = time.time() + 60*60*24*10
      cookies['visitor'] = cookie_id
      cookies['trial'] = str(trial)
    
    visitor = Visitor.all(keys_only=keys_only).filter('cookie_id =',cookie_id).get()
    
    # create 10 day account
    if not visitor:
      visitor = Visitor()
      visitor.cookie_id = cookie_id
      visitor.trial = float(trial)
      visitor.put()
    
    # update account (first login)
    try:
      visitor.google_id = google_id
      visitor.put()
    except UnboundLocalError:
      pass
  
  return visitor

def fetch_wall(wall_name, visitor_key, keys_only=False):
  wall = Wall.all(keys_only=keys_only).filter('name =',wall_name).get()
  
  if not wall:
    wall = Wall(parent=visitor_key)
    wall.name = wall_name
    wall.view = True
    wall.edit = False
    key = wall.put()
    
    if keys_only:
      wall = key
    
  return wall

def fetch_settings(wall_key, keys_only=False):
  setting = Setting.all(keys_only=keys_only).ancestor(wall_key).get()
  
  if not setting:
    setting = Setting(parent=wall_key)
    setting.view = True
    setting.edit = False
    key = setting.put()
    
    if keys_only:
      setting = key
    
  return setting  

def fetch_preferences(visitor_key, keys_only=False):
  preference = Preference.all(keys_only=keys_only).ancestor(visitor_key).get()
  
  if not preference:
    preference = Preference(parent=visitor_key)
    preference.snap = False
    preference.hover = False
    preference.footer = False
    preference.grid = False
    key = preference.put()
    
    if keys_only:
      preference = key
  
  return preference 

#def update_task(note,data,visitor_key=None):
#  try:
#    if note.taskListID and (note.text != str(data['text'])):
#      service = build('tasks', 'v1', http=decorator.http())
#      task = service.tasks().get(tasklist=note.taskListID, task=note.taskID).execute()
#      task['title'] = str(data['text'])
#      result = service.tasks().update(tasklist=note.taskListID, task=task['id'], body=task).execute()
#  # This Note is not a Task
#  except AttributeError:
#    pass
#    
#def delete_task(note,data,visitor_key=None):
#  try:
#    # Leave clearing to Google Tasks if the Note has already been completed
#    if note.taskListID and not note.taskCompleted:
#      service = build('tasks', 'v1', http=decorator.http())
#      service.tasks().delete(tasklist=note.taskListID, task=note.taskID).execute()
#        
#  # This Note is not a Task
#  except AttributeError:
#    pass
  
def put_note(note,data,visitor_key=None):   
  if visitor_key:
    note.creator = visitor_key.id()
    
  note.counter = int(data['counter'])
  note.text = str(data['text'])
  note.x = int(data['x'])
  note.y = int(data['y'])
  note.z = int(data['z'])
  note.scale = float(data['scale'])
  note.color = int(data['color'])
  note.font = int(data['font'])
  note.deleted = False
  key = note.put()
  return key
  
def update_clients(note,visitor_key,wall_key,now,self=None):
  wall_id = int(wall_key.id())
  channels = Channel.all().filter('viewing =',wall_id)#.filter('timestamp >',now-1000*60*6)
  viewing_num = channels.count()
  
  note.id = note.key().id()
  note.date = None
  content = {
    'wall_id':wall_key.id(),
    'visitor_id':visitor_key.id(),
    'note':note,
    'viewing_num':viewing_num
  }
  data = GqlEncoder().encode(content)
  
  for chan in channels:
    if chan.timestamp > now-1000*60*6:
      chan.delete()
    else:
      channel.send_message(chan.client_id, data)


#decorator = OAuth2Decorator(client_id=settings.CLIENT_ID,
#                            client_secret=settings.CLIENT_SECRET,
#                            scope=settings.SCOPE,
#                            user_agent='typonotes')
      
class MainPage(webapp.RequestHandler):
  """Returns the mainpage"""
  #@decorator.oauth_aware
  def get(self,w):
  
    #query = Channel.all()
    #entries =query.fetch(1000)
    #db.delete(entries)
  
    template_values = {
      'app_name': 'Freamon',
      'err_js': 'Please activate Javascript.',
      'err_browser': 'Please update your Browser.',
      'is_login': False,
      'expires_in': '0',
      'connect_text': 'Connect with another Service',
      'is_login_google': False,
      'login_google_false': 'Login with Google',
      'login_google_true': 'Disconnect from Google',
      'login_twitter': 'Login with Twitter',
      'login_facebook': 'Login with Facebook',
      'new_wall': 'Create new Wall',
      'delete_all': 'Delete all Notes',
      'settings': 'Settings',
      'dialog_new': 'Create a new Wall',
      'dialog_new_text': 'Please choose a name for your Wall. If the name is already taken it will show that Wall instead.',
      'dialog_delete': 'Really delete all Notes?',
      'dialog_delete_text': 'These Notes will be permanently deleted and cannot be recovered. Are you sure?',
    }
  
    # Wall related
    if(w):
      wall_name = w
    elif(self.request.get('w')):
      wall_name = self.request.get('w')
    else:
      wall_name = 'public'
      
    if (self.request.get('nointerface') == '1'):
      file = 'nointerface.html'
    else:
      file = 'index.html'
      
    if (self.request.get('stackdown') == '1'):
      template_values['stackdown'] = '1'
    else:
      template_values['stackdown'] = '0'
    
    visitor = fetch_visitor(self)   
    wall_key = fetch_wall(visitor_key=visitor.key(),wall_name=wall_name,keys_only=True)
    wall_id = int(wall_key.id())
  
    google_account = users.get_current_user()
    if google_account:
      template_values['is_login'] = True
      template_values['is_login_google'] = True
      user_link = users.create_logout_url(self.request.url)
      
      # Taks API
      #if decorator.has_credentials():
      # service = build('tasks', 'v1', http=decorator.http())
      # result  = service.tasklists().list().execute()
      # tasklists = result.get('items', [])
      # for tasklist in tasklists:
      #   tasklist['title_short'] = tasklist['title'][:26]
      #   
      # template_values['tasklists'] = tasklists
      #else:
      # self.redirect(decorator.authorize_url())
    else:
      user_link = users.create_login_url(self.request.url)
      expires_in = int((float(visitor.trial) - time.time())/(60*60*24))
      
      template_values['expires_in'] = str(expires_in)
      template_values['connect_text'] = 'Your cookie expires in '+str(expires_in)+' days' 
  
    # Channel API
    client_id = str(visitor.key().id())
    token = channel.create_channel(client_id)
    
    chan = Channel.all().ancestor(visitor.key()).get()
    if not chan:
      chan = Channel(parent=visitor.key())
      chan.client_id = client_id
    
    if not wall_id in chan.viewing:
      chan.viewing.append(wall_id)
      chan.put()      
    
    # Template
    template_values['visitor_id'] = visitor.key().id()
    template_values['wall_id'] = wall_id
    template_values['wall_name'] = wall_name
    template_values['token'] = token
    template_values['user_link'] = user_link
    template_values['viewing_num'] = 0

    path = os.path.join(os.path.dirname(__file__), file)  
    self.response.out.write(template.render(path, template_values))
    
class LoadWall(webapp.RequestHandler):
  """Loads the entire wall"""
  #@decorator.oauth_aware
  def post(self):
    try:
      data = load_data(self)
      visitor_key = fetch_visitor(self,keys_only=True)
      wall_key = fetch_wall(wall_name=data['wall'],visitor_key=visitor_key,keys_only=True)
      wall_parent = wall_key.parent()
      setting = fetch_settings(wall_key)
    
      # check permissions
      if (visitor_key != wall_parent) and not setting.view:
        raise PermissionError(None)
    
      # Retrieve all tasks
      #service = build('tasks', 'v1', http=decorator.http())
      #alltasks = []
      #tasklists = service.tasklists().list().execute()
      #for tasklist in tasklists['items']:
      #  tasks = service.tasks().list(tasklist=tasklist['id']).execute()
      #  alltasks.extend(tasks['items'])
    
      notes = Note.all().ancestor(wall_key).order('-date').fetch(100)
    
      for note in notes:        
        note.id = note.key().id()
        note.owner = (visitor_key.id() == note.creator)
        note.date = None
      
        #if note.taskID:
        #  for task in alltasks:
        #    if task['id'] == note.taskID:
        #      note.text = task['title']
        #      note.taskCompleted = (task['status'] == 'completed')
        #      note.put()
        
      content = GqlEncoder().encode(notes)
      
    except KeyError:
      content = {'error':'Invalid Input'}
    except PermissionError:
      content = {'error':'Forbidden'}
      
    send_data(self,content)

class LoadSettings(webapp.RequestHandler):
  def post(self):
    try:
      data = load_data(self)
      visitor_key = fetch_visitor(self,keys_only=True)
      wall_key = fetch_wall(wall_name=data['wall'],visitor_key=visitor_key,keys_only=True)
      preference = fetch_preferences(visitor_key)
      setting = fetch_settings(wall_key)
      
      content = {
        'edit': {
          'value': setting.edit,
          'text_true': 'Users are allowed to edit this Wall',
          'text_false': 'Users are forbidden to edit this Wall'
        },
        'view': {
          'value': setting.view,
          'text_true': 'Users are allowed to view this Wall',
          'text_false': 'Users are forbidden to view this Wall'
        },
        'grid': {
          'value': preference.grid,
          'text_true': 'Show Background Grid',
          'text_false': 'Hide Background Grid'
        },
        'snap': {
          'value': preference.snap,
          'text_true': 'Disable sticky Notes',
          'text_false': 'Enable sticky Notes'
        },
        'hover': {
          'value': preference.hover,
          'text_true': 'Enable Note Mouseover',
          'text_false': 'Disable Note Mouseover'
        },
        'footer': {
          'value': preference.footer,
          'text_true': 'Show the Footer',
          'text_false': 'Hide the Footer'
        },
      }
    
    except KeyError:
      content = {'error':'Invalid Input'}
    
    send_data(self,content)
      
class Insert(webapp.RequestHandler):
  """Inserts a new Note"""
  def post(self):
    try:
      data = load_data(self)
      visitor_key = fetch_visitor(self,keys_only=True)
      wall_key = fetch_wall(data['wall'],visitor_key=visitor_key,keys_only=True)
      setting = fetch_settings(wall_key)
      content = None
      
      note = Note(parent=wall_key)
      
      # check view wall permission
      if not (visitor_key == wall_key.parent()):
        if not setting.view:
          raise PermissionError()
  
      note_key = put_note(note,data,visitor_key)
      update_clients(note,visitor_key,wall_key,data['timestamp'],self)
      data = {'id': note_key.id()}
      
    except KeyError:
      data = {'error':'Invalid Input'}
    except PermissionError:
      data = {'error':'Forbidden'}
    except LatencyError:
      data = {'error':'Latency'}
    
    send_data(self,data)    
        
class Update(webapp.RequestHandler):
  """Updates a new Note"""
  def post(self):
    try:
      data = load_data(self)
      visitor_key = fetch_visitor(self,keys_only=True)
      wall_key = fetch_wall(data['wall'],visitor_key=visitor_key,keys_only=True)
      setting = fetch_settings(wall_key)
      content = None
      
      # check view wall permission
      if not (visitor_key == wall_key.parent()):
        if not setting.view:
          raise PermissionError()
      
      note = Note.get_by_id(ids=long(data['id']), parent=wall_key)
      if note:
        # check edit note permission
        if not (visitor_key == wall_key.parent()):
          if not (visitor_key.id() == note.creator) and not setting.edit:
            raise PermissionError()     
        
        if data['counter'] < note.counter:
          raise LatencyError()
        
        #update_task(note,data)
        note_key = put_note(note,data)
        update_clients(note,visitor_key,wall_key,data['timestamp'],self)
        content = {'id': note_key.id()}
          
      
    except KeyError:
      content = {'error':'Invalid Input'}
    except PermissionError:
      note.id = note.key().id()
      content = {'error':'Forbidden','note':note}
      content = GqlEncoder().encode(content)
    except LatencyError:
      content = {'error':'Latency'}
    except UnicodeEncodeError:
      content = {'error':'No special chars allowed'}
    
    send_data(self,content)   
      
class Delete(webapp.RequestHandler):
  """Delete a existing Note"""
  def post(self):
    try:
      data = load_data(self)
      visitor_key = fetch_visitor(self,keys_only=True)
      wall_key = fetch_wall(data['wall'],visitor_key=visitor_key,keys_only=True)
      setting = fetch_settings(wall_key)
      content = None
      
      note = Note.get_by_id(ids=long(data['id']), parent=wall_key)
      if note:
        # check view wall permission
        if not (visitor_key == wall_key.parent()):
          if not setting.view:
            raise PermissionError()
        
        # check edit note permission
        if not (visitor_key == wall_key.parent()):
          if not (visitor_key.id() == note.creator) and not setting.edit:
            raise PermissionError()     
        
        if data['counter'] < note.counter:
          raise LatencyError()
        
        #delete_task(note,data)
        note.deleted = True
        update_clients(note,visitor_key,wall_key,data['timestamp'],self)
        content = {'id':note.key().id()}
        note.delete()
        
    except KeyError:
      content = {'error':'Invalid Input'}
    except PermissionError:
      note.id = note.key().id()
      content = {'error':'Forbidden','note':note}
      content = GqlEncoder().encode(content)
    except LatencyError:
      content = {'error':'Latency'}
    
    send_data(self,content)
      
class SetSettings(webapp.RequestHandler):
  def post(self):
    try:
      data = load_data(self)
      visitor_key = fetch_visitor(self,keys_only=True)
      wall_key = fetch_wall(data['wall'],visitor_key=visitor_key,keys_only=True)
      wall_parent = wall_key.parent()
      
      preference = fetch_preferences(visitor_key)
      setting = fetch_settings(wall_key)
      
      # Preference related
      if 'snap' in data['property']:
        preference.snap = data['value']
      if 'hover' in data['property']:
        preference.hover = data['value']
      if 'footer' in data['property']:
        preference.footer = data['value']
      if 'grid' in data['property']:
        preference.grid = data['value']
      preference.put()
      
      # Wall related
      if 'view' in data['property'] or 'edit' in data['property']:
        if not (visitor_key == wall_parent):
          raise PermissionError()
        
        if 'view' in data['property']:
          setting.view = data['value']
        if 'edit' in data['property']:
          setting.edit = data['value']
        setting.put()
        
    except KeyError:
      data = {'error':'Invalid Input'}
    except PermissionError:
      data = {'error':'Forbidden'}
    
    send_data(self,data)
    
class KeepAlive(webapp.RequestHandler):
  def post(self):
    data = load_data(self)
    visitor_key = fetch_visitor(self,keys_only=True)
    wall_key = fetch_wall(data['wall'],visitor_key=visitor_key,keys_only=True)
    wall_id = int(wall_key.id())
    now = data['timestamp']
    
    channel = Channel.all().ancestor(visitor_key).get()
    if channel:
      channel.timestamp = int(now)
      channel.put()
    
    viewing_num = Channel.all(keys_only=True).filter('viewing =',wall_id).filter('timestamp >',now-1000*60*6).count()
    content = {'viewing_num':viewing_num}
    
    send_data(self,content)
    
#class AddTask(webapp.RequestHandler):
#  #@decorator.oauth_required
#  def post(self):
#    try:
#      data = load_data(self)
#      visitor_key = fetch_visitor(self,keys_only=True)
#      wall_key = fetch_wall(data['wall'],visitor_key=visitor_key,keys_only=True)
#      setting = fetch_settings(wall_key)
#            
#      try:
#        taskListID = data['taskListID']
#      except KeyError:
#        taskListID = '@default'
#      
#      service = build('tasks', 'v1', http=decorator.http())
#      
#      note = Note.get_by_id(ids=long(data['noteID']), parent=wall_key)
#      if note:
#        # check edit note permission
#        if not (visitor_key == wall_key.parent()):
#          if not (visitor_key.id() == note.creator) and not setting.edit:
#            raise PermissionError() 
#      
#        # Update if task exists
#        if note.taskID:
#          task = service.tasks().get(tasklist=taskListID, task=note.taskID).execute()
#          task['title'] = data['title']
#          
#          # Completed?
#          try:
#            if data['taskCompleted']:
#              task['status'] = 'completed'  
#            else:
#              task['status'] = 'needsAction'
#              del task['completed']
#          except KeyError:
#            pass
#
#          result = service.tasks().update(tasklist=taskListID, task=task['id'], body=task).execute()
#                        
#          
#        
#        # Create new Task
#        else:
#          task = {
#            'title': data['title']
#          }
#          result = service.tasks().insert(tasklist=taskListID, body=task).execute()
#  
#          note.taskListID = taskListID
#          note.taskID = result['id']
#          note.color = 6
#          note.put()
#      
#        content = {'taskID':note.taskID}
#        
#    except PermissionError:
#      # Send Task anyway, but no binding
#      task = {
#        'title': data['title']
#      }
#      result = service.tasks().insert(tasklist=taskListID, body=task).execute()
#      note.id = note.key().id()
#      content = {'error':'Forbidden','note':note}
#      content = GqlEncoder().encode(content)
#      
#    send_data(self,content)
    
application = webapp.WSGIApplication(
  [('/insert', Insert),
   ('/update', Update),
   ('/delete', Delete),
   ('/loadwall', LoadWall),
   ('/loadsettings', LoadSettings),
   ('/settings', SetSettings),
   ('/keepalive', KeepAlive),
   #('/addtask', AddTask),
   (r'/(.*)', MainPage),
  ],debug=True)
                   
def main():
  run_wsgi_app(application)
  
if __name__ == "__main__":
  main()
