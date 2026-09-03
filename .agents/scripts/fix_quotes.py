text = "In the original Greek language, the word “believe” means to trust in, cling to, and rely upon. In other words, “believe” in the original Greek language is an active faith—much like the faith rock climbers have in the rope to hold them secure. Becoming a Christian means placing that kind of trust in Jesus: relying fully on His death for your sins and His resurrection for your eternal life."
text = text.replace("“", '"').replace("”", '"').replace("’", "'").replace("—", "- ")
print(text)
