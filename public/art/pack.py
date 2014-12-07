import os

#----CONFIG----
SCALER_PATCH = "packing\\IM\\convert.exe"
DUPA = "dupa.txt"
#--------------

def scale(input, output, percent):	
	i = 0.0
	print("----Scalling----");	
	for img in os.listdir(input):
		if img[-3:] == 'png' or img[-3:] == 'jpg':
			#os.system('del '+output+d+'\\'+del_d)
			#-filter Lanczos
			s = SCALER_PATCH+" -resize \"200\" \""+input+"\\"+img+"\" \""+output+"\\"+img+"\""
			os.system(s)
	print("----Finished----")
	print("")

		
#-----SCALING-AND-PACKING-----
scale("orig\\", "card_minions\\", "100")
#-----SYNCING-ASSETS-----
#os.system('"J:\\Alcatraz Workspace\\sync_assets.py"')